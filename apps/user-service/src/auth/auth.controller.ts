import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    id?: string;
  };
};

type LocalAuthRequest = Request & {
  user: User;
};

@Controller('auth')
export class AuthController {
  private readonly refreshCookieName = 'balii_refresh_token';

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('test')
  test() {
    return 'auth ok';
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(
    @Req() req: LocalAuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(req.user);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') ?? '';
    response.clearCookie(
      this.refreshCookieName,
      this.refreshCookieBaseOptions(),
    );
    return this.authService.logout(req.user.userId, token);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.email);
  }

  @Post('refresh')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: Partial<RefreshTokenDto>,
  ) {
    const cookieToken = this.readCookie(
      request.headers.cookie,
      this.refreshCookieName,
    );
    const refreshToken = cookieToken || dto.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    const decoded = this.authService.decodeRefreshToken(refreshToken);
    const userId = decoded.sub || dto.userId;
    if (!userId) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
    const result = await this.authService.refreshToken(userId, refreshToken);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(
      dto.email,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(
      this.refreshCookieName,
      refreshToken,
      this.refreshCookieOptions(),
    );
  }

  private refreshCookieOptions() {
    return {
      ...this.refreshCookieBaseOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private refreshCookieBaseOptions() {
    return {
      httpOnly: true,
      secure: (process.env.APP_ENV || process.env.NODE_ENV) === 'production',
      sameSite: 'lax' as const,
      path: '/auth',
    };
  }

  private readCookie(
    cookieHeader: string | undefined,
    name: string,
  ): string | undefined {
    const item = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
  }
}
