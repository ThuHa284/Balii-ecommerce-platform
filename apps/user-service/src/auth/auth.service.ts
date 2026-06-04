import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { RegisterDto } from './dto/register.dto';

import { randomBytes, createHash } from 'crypto';
import nodemailer = require('nodemailer');
import { EmailVerification } from '../entities/email-verification.entity';
import { UsersService } from '../users/users.service';
import { PasswordReset } from '../entities/password-reset.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { TypeOrmModule } from '@nestjs/typeorm';
@Injectable()



export class AuthService {
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

constructor(
  @InjectRepository(EmailVerification)
  private emailVerificationRepo: Repository<EmailVerification>,

  @InjectRepository(User)
    private readonly userRepo: Repository<User>,

  @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
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
   const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'secret',
        expiresIn: '15m',
        });
        console.log('LOGIN ACCESS TOKEN:', accessToken);
   const refreshToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        expiresIn: '7d',
      });
  await this.redis.set(
      `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        7 * 24 * 60 * 60,
    );
  const checkRedisToken = await this.redis.get(
      `refresh_token:${user.id}`,
    );
    console.log('LOGIN USER ID:', user.id);
    console.log('LOGIN REFRESH TOKEN:', refreshToken);
    console.log('REDIS SAVED TOKEN:', checkRedisToken);
    console.log('SAVE MATCH:', checkRedisToken === refreshToken);
    return {
      accessToken,
      refreshToken,
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
  
  async refreshToken(refreshToken: string) {
  const payload = await this.jwtService.verifyAsync(refreshToken, {
    secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
  });

  const userId = payload.sub;
  const redisKey = `refresh_token:${userId}`;
  const savedRefreshToken = await this.redis.get(redisKey);

  if (!savedRefreshToken) {
    throw new UnauthorizedException('Refresh token không tồn tại');
  }

  if (savedRefreshToken !== refreshToken) {
    throw new UnauthorizedException('Refresh token không hợp lệ');
  }

  const newPayload = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  const newAccessToken = await this.jwtService.signAsync(newPayload, {
    secret: process.env.JWT_SECRET || 'secret',
    expiresIn: '15m',
  });

  const newRefreshToken = await this.jwtService.signAsync(newPayload, {
    secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    expiresIn: '7d',
  });

  await this.redis.set(
    redisKey,
    newRefreshToken,
    'EX',
    7 * 24 * 60 * 60,
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}
  async forgotPassword(email: string, ip?: string, userAgent?: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    // Không nên báo email không tồn tại để tránh lộ tài khoản
    if (!user) {
      return {
        message: 'Nếu email tồn tại, hệ thống sẽ gửi link đặt lại mật khẩu.',
      };
    }

    const rawToken = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.passwordResetRepo.save({
      userId: user.id,
      token: tokenHash,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });

   const resetLink =
  `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

await this.sendResetPasswordEmail(user.email, resetLink);

return {
  message: 'Nếu email tồn tại, hệ thống sẽ gửi link đặt lại mật khẩu.',
};
}

  private async sendResetPasswordEmail(email: string, resetLink: string) {
 

  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
  throw new Error('Thiếu cấu hình MAIL trong file .env');
}

  const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  });
  console.log(process.env.MAIL_HOST);
  console.log(process.env.MAIL_USER);
  console.log(process.env.MAIL_PASS);
  console.log(process.env.MAIL_FROM);
  await transporter.sendMail({
  from: process.env.MAIL_FROM || `"Balii SleepWear" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Đặt lại mật khẩu Balii SleepWear',
    html: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
      <p>Nhấn vào link bên dưới để đổi mật khẩu:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Link có hiệu lực trong 15 phút.</p>
    `,
  });
}

async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.passwordResetRepo.findOne({
      where: {
        token: dto.token,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Token không hợp lệ, đã dùng hoặc đã hết hạn');
    }

    const user = resetToken.user;

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    user.passwordHash = hashedPassword;
    user.updatedAt = new Date();

    resetToken.usedAt = new Date();

    await this.userRepo.save(user);
    await this.passwordResetRepo.save(resetToken);

    return {
      message: 'Đặt lại mật khẩu thành công',
    };
  }
}
