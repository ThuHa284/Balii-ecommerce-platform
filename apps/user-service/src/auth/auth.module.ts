import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailVerification } from '../entities/email-verification.entity';
import { UsersModule } from '../users/users.module';
import { PasswordReset } from '../entities/password-reset.entity';


@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([User, Role, EmailVerification, PasswordReset]),

    PassportModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
  ],

  exports: [AuthService],
})
export class AuthModule {}