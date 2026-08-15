import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAccountService } from './google-account.service';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { OAuthAccount } from '../entities/oauth-account.entity';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { EmailVerification } from '../entities/email-verification.entity';
import { UsersModule } from '../users/users.module';
import { PasswordReset } from '../entities/password-reset.entity';
import { getSecuritySecret } from '@app/common';
import {
  GoogleAuthGuard,
  GoogleCallbackAuthGuard,
} from './guards/google-auth.guard';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      User,
      Role,
      OAuthAccount,
      EmailVerification,
      PasswordReset,
    ]),

    PassportModule,

    JwtModule.register({
      secret: getSecuritySecret('JWT_SECRET', 'secret'),
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [AuthController, GoogleAuthController],

  providers: [
    AuthService,
    GoogleAccountService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
    GoogleCallbackAuthGuard,
  ],

  exports: [AuthService],
})
export class AuthModule {}
