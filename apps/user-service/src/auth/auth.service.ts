import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { RegisterDto } from './dto/register.dto';

import { randomBytes } from 'crypto';
import nodemailer = require('nodemailer');
import { EmailVerification } from '../entities/email-verification.entity';

@Injectable()
export class AuthService {
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    @InjectRepository(EmailVerification)
    private emailVerificationRepo: Repository<EmailVerification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existed = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existed) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const customerRole = await this.roleRepo.findOne({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new BadRequestException('Không tìm thấy vai trò CUSTOMER');
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
    const token = randomBytes(32).toString('hex');

await this.emailVerificationRepo.save({
  userId: user.id,
  token,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
});

await this.sendVerificationEmail(user.email, token);

    return {
      message: 'Đăng ký thành công. Vui lòng xác thực email.',
      userId: user.id,
    };
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Tài khoản này đăng nhập bằng Google');
    }

    //const isMatch = await bcrypt.compare(password, user.passwordHash);
  console.log('LOGIN EMAIL:', email);
  console.log('USER FOUND:', user ? user.email : null);
  console.log('PASSWORD INPUT:', password);
  console.log('PASSWORD HASH:', user?.passwordHash);

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  console.log('IS_MATCH:', isMatch);
      if (!isMatch) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    if (!user.emailVerifiedAt) {
  throw new UnauthorizedException('Vui lòng xác thực email trước khi đăng nhập');
}
    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
      },
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const savedToken = await this.redis.get(`refresh_token:${userId}`);

    if (!savedToken || savedToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return this.login(user);
  }

  async logout(userId: string, accessToken: string) {
    await this.redis.del(`refresh_token:${userId}`);

    await this.redis.set(
      `blacklist:${accessToken}`,
      '1',
      'EX',
      15 * 60,
    );

    return { message: 'Đăng xuất thành công' };
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

  const verifyUrl = `${process.env.APP_URL || 'http://localhost:4001'}/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@balii.com',
    to: email,
    subject: 'Xác thực tài khoản Balii SleepWear',
    html: `
      <h2>Xác thực tài khoản</h2>
      <p>Bấm vào link bên dưới để xác thực email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>Link có hiệu lực trong 15 phút.</p>
    `,
  });
}
  async verifyEmail(token: string) {
  const record = await this.emailVerificationRepo.findOne({
    where: { token },
  });

  if (!record) {
    throw new BadRequestException('Token xác thực không hợp lệ');
  }

  if (record.usedAt) {
    throw new BadRequestException('Token đã được sử dụng');
  }

  if (record.expiresAt < new Date()) {
    throw new BadRequestException('Token đã hết hạn');
  }

  await this.userRepo.update(record.userId, {
    emailVerifiedAt: new Date(),
  });

  record.usedAt = new Date();
  await this.emailVerificationRepo.save(record);

  return {
    message: 'Xác thực email thành công',
  };
}
  async resendVerificationEmail(email: string) {
  const user = await this.userRepo.findOne({
    where: { email },
  });

  if (!user) {
    throw new BadRequestException('Email chưa được đăng ký');
  }

  if (user.emailVerifiedAt) {
    return {
      message: 'Email này đã được xác thực',
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
    message: 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.',
  };
}
}