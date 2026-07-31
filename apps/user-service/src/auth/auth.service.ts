/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';
import nodemailer = require('nodemailer');
import { Repository } from 'typeorm';

import { EmailVerification } from '../entities/email-verification.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { getSecuritySecret } from '@app/common';

@Injectable()
export class AuthService {
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepo: Repository<EmailVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existed = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (existed) {
      throw new BadRequestException('Email da ton tai');
    }

    const customerRole = await this.roleRepo.findOne({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new BadRequestException('Khong tim thay vai tro CUSTOMER');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      roleId: customerRole.id,
    });

    await this.userRepo.save(user);

    if (!this.isEmailVerificationEnabled()) {
      user.emailVerifiedAt = new Date();
      await this.userRepo.save(user);

      return {
        message: 'Dang ky thanh cong.',
        userId: user.id,
        requiresEmailVerification: false,
      };
    }

    const token = randomBytes(32).toString('hex');
    await this.emailVerificationRepo.save({
      userId: user.id,
      token: this.hashActionToken(token),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await this.sendVerificationEmail(user.email, token);

    return {
      message: 'Dang ky thanh cong. Vui long xac thuc email.',
      userId: user.id,
      requiresEmailVerification: true,
    };
  }

  async validateLocalUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Tai khoan nay dang nhap bang Google');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tai khoan da bi khoa');
    }

    if (!user.emailVerifiedAt && this.isEmailVerificationEnabled()) {
      throw new UnauthorizedException(
        'Vui long xac thuc email truoc khi dang nhap',
      );
    }

    return user;
  }

  async login(user: User) {
    const hydratedUser = user.role
      ? user
      : await this.loadUserWithRole(user.id);
    const payload = {
      sub: hydratedUser.id,
      email: hydratedUser.email,
      role: hydratedUser.role.name,
      sessionIssuedAt: Date.now(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: getSecuritySecret('JWT_SECRET', 'secret'),
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: getSecuritySecret('JWT_REFRESH_SECRET', 'refresh_secret'),
      expiresIn: '7d',
    });

    await this.redis.set(
      `refresh_token:${hydratedUser.id}`,
      this.hashActionToken(refreshToken),
      'EX',
      7 * 24 * 60 * 60,
    );

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(hydratedUser),
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const savedToken = await this.redis.get(`refresh_token:${userId}`);

    if (!savedToken || savedToken !== this.hashActionToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token khong hop le');
    }

    const user = await this.loadUserWithRole(userId);
    return this.login(user);
  }

  async refreshToken(userId: string, refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: getSecuritySecret('JWT_REFRESH_SECRET', 'refresh_secret'),
        },
      );

      if (payload.sub !== userId) {
        throw new UnauthorizedException('Refresh token khong hop le');
      }

      return this.refresh(userId, refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token khong hop le');
    }
  }

  decodeRefreshToken(refreshToken: string): { sub?: string } {
    return this.jwtService.decode<{ sub?: string }>(refreshToken) ?? {};
  }

  async logout(userId: string, accessToken: string) {
    await this.redis.del(`refresh_token:${userId}`);

    if (accessToken) {
      const decoded = this.jwtService.decode<{ exp?: number }>(accessToken);
      const expiresInSeconds = decoded?.exp
        ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1)
        : 15 * 60;
      await this.redis.set(
        `blacklist:${accessToken}`,
        '1',
        'EX',
        expiresInSeconds,
      );
    }

    return { message: 'Đăng xuất thành công' };
  }

  async verifyEmail(token: string) {
    const record = await this.emailVerificationRepo.findOne({
      where: { token: this.hashActionToken(token) },
    });

    if (!record) {
      throw new BadRequestException('Token xac thuc khong hop le');
    }

    if (record.usedAt) {
      throw new BadRequestException('Token da duoc su dung');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token da het han');
    }

    await this.userRepo.update(record.userId, {
      emailVerifiedAt: new Date(),
    });

    record.usedAt = new Date();
    await this.emailVerificationRepo.save(record);

    return {
      message: 'Xac thuc email thanh cong',
    };
  }

  async forgotPassword(
    email: string,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        message:
          'Neu email ton tai trong he thong, chung toi da gui huong dan dat lai mat khau.',
      };
    }

    await this.passwordResetRepo
      .createQueryBuilder()
      .update()
      .set({
        usedAt: new Date(),
      })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('used_at IS NULL')
      .execute();

    const token = randomBytes(32).toString('hex');
    await this.passwordResetRepo.save({
      userId: user.id,
      token: this.hashActionToken(token),
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    if (this.isEmailVerificationEnabled()) {
      await this.sendPasswordResetEmail(user.email, token);
    }

    return {
      message:
        'Neu email ton tai trong he thong, chung toi da gui huong dan dat lai mat khau.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const userId = await this.passwordResetRepo.manager.transaction(
      async (manager) => {
        const resetRepository = manager.getRepository(PasswordReset);
        const record = await resetRepository.findOne({
          where: { token: this.hashActionToken(dto.token) },
          lock: { mode: 'pessimistic_write' },
        });

        if (!record) {
          throw new BadRequestException('Token dat lai mat khau khong hop le');
        }

        if (record.usedAt) {
          throw new BadRequestException(
            'Token dat lai mat khau da duoc su dung',
          );
        }

        if (record.expiresAt < new Date()) {
          throw new BadRequestException('Token dat lai mat khau da het han');
        }

        await manager.update(User, record.userId, { passwordHash });
        record.usedAt = new Date();
        await resetRepository.save(record);
        return record.userId;
      },
    );

    await this.redis.del(`refresh_token:${userId}`);
    await this.redis.set(
      `tokens_valid_after:${userId}`,
      String(Date.now()),
      'EX',
      15 * 60,
    );

    return {
      message: 'Dat lai mat khau thanh cong',
    };
  }

  async resendVerificationEmail(email: string) {
    const genericResponse = {
      message:
        'Nếu tài khoản tồn tại và chưa xác thực, hệ thống sẽ gửi email hướng dẫn.',
    };
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return genericResponse;
    }

    if (user.emailVerifiedAt) {
      return genericResponse;
    }

    if (!this.isEmailVerificationEnabled()) {
      await this.userRepo.update(user.id, {
        emailVerifiedAt: new Date(),
      });

      return genericResponse;
    }

    await this.emailVerificationRepo
      .createQueryBuilder()
      .update()
      .set({
        usedAt: new Date(),
      })
      .where('user_id = :userId', {
        userId: user.id,
      })
      .andWhere('used_at IS NULL')
      .execute();

    const token = randomBytes(32).toString('hex');
    await this.emailVerificationRepo.save({
      userId: user.id,
      token: this.hashActionToken(token),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await this.sendVerificationEmail(user.email, token);

    return genericResponse;
  }

  private hashActionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendVerificationEmail(email: string, token: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const verifyBaseUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';
    const verifyUrl = `${verifyBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@balii.com',
      to: email,
      subject: 'Xac thuc tai khoan Balii SleepWear',
      html: `
        <h2>Xac thuc tai khoan</h2>
        <p>Bam vao link ben duoi de xac thuc email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>Link co hieu luc trong 15 phut.</p>
      `,
    });
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@balii.com',
      to: email,
      subject: 'Đặt lại mật khẩu Balii SleepWear',
      html: `
        <h2>Đặt lại mật khẩu</h2>
        <p>Nhấn vào liên kết bên dưới để đặt mật khẩu mới:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Liên kết có hiệu lực trong 15 phút.</p>
      `,
    });
  }

  private isEmailVerificationEnabled(): boolean {
    if (process.env.DISABLE_EMAIL_VERIFICATION === 'true') {
      return false;
    }

    const configured = Boolean(
      process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS,
    );
    if (
      !configured &&
      (process.env.APP_ENV || process.env.NODE_ENV) === 'production'
    ) {
      throw new InternalServerErrorException(
        'Email verification is required but mail service is not configured.',
      );
    }

    return configured;
  }

  private async loadUserWithRole(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Nguoi dung khong ton tai');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Tai khoan da bi khoa');
    }
    if (!user.emailVerifiedAt && this.isEmailVerificationEnabled()) {
      throw new UnauthorizedException(
        'Vui long xac thuc email truoc khi tiep tuc',
      );
    }

    return user;
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role?.name ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
