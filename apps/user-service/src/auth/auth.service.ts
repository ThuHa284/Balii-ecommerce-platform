/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import nodemailer = require('nodemailer');
import { Repository } from 'typeorm';

import { EmailVerification } from '../entities/email-verification.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
    const existed = await this.userRepo.findOne({
      where: { email: dto.email },
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
      email: dto.email,
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
      };
    }

    const token = randomBytes(32).toString('hex');
    await this.emailVerificationRepo.save({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await this.sendVerificationEmail(user.email, token);

    return {
      message: 'Dang ky thanh cong. Vui long xac thuc email.',
      userId: user.id,
    };
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email },
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
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      expiresIn: '7d',
    });

    await this.redis.set(
      `refresh_token:${hydratedUser.id}`,
      refreshToken,
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

    if (!savedToken || savedToken !== refreshToken) {
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
          secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
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

  async logout(userId: string, accessToken: string) {
    await this.redis.del(`refresh_token:${userId}`);

    if (accessToken) {
      await this.redis.set(`blacklist:${accessToken}`, '1', 'EX', 15 * 60);
    }

    return { message: 'Dang xuat thanh cong' };
  }

  async verifyEmail(token: string) {
    const record = await this.emailVerificationRepo.findOne({
      where: { token },
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
    const user = await this.userRepo.findOne({
      where: { email },
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
      token,
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return {
      message:
        'Neu email ton tai trong he thong, chung toi da gui huong dan dat lai mat khau.',
      resetToken: token,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.passwordResetRepo.findOne({
      where: { token: dto.token },
      relations: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Token dat lai mat khau khong hop le');
    }

    if (record.usedAt) {
      throw new BadRequestException('Token dat lai mat khau da duoc su dung');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token dat lai mat khau da het han');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(record.userId, {
      passwordHash,
    });

    record.usedAt = new Date();
    await this.passwordResetRepo.save(record);
    await this.redis.del(`refresh_token:${record.userId}`);

    return {
      message: 'Dat lai mat khau thanh cong',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Email chua duoc dang ky');
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'Email nay da duoc xac thuc',
      };
    }

    if (!this.isEmailVerificationEnabled()) {
      await this.userRepo.update(user.id, {
        emailVerifiedAt: new Date(),
      });

      return {
        message: 'Moi truong local dang tat xac thuc email.',
      };
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
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await this.sendVerificationEmail(user.email, token);

    return {
      message: 'Da gui lai email xac thuc.',
    };
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
    const verifyUrl = `${verifyBaseUrl}/auth/verify-email?token=${token}`;

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

  private isEmailVerificationEnabled(): boolean {
    if (process.env.DISABLE_EMAIL_VERIFICATION === 'true') {
      return false;
    }

    return Boolean(
      process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS,
    );
  }

  private async loadUserWithRole(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Nguoi dung khong ton tai');
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
