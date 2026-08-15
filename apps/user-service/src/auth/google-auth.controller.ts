import {
  Controller,
  Get,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { GoogleOAuthExceptionFilter } from './filters/google-oauth-exception.filter';
import { getGoogleFrontendCallbackUrl } from './google-oauth.config';
import {
  GoogleAuthGuard,
  GoogleCallbackAuthGuard,
} from './guards/google-auth.guard';

type GoogleAuthenticatedRequest = Request & { user: User };

@Controller('auth')
export class GoogleAuthController {
  private readonly refreshCookieName = 'balii_refresh_token';

  constructor(private readonly authService: AuthService) {}

  @UseFilters(GoogleOAuthExceptionFilter)
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  login() {
    return undefined;
  }

  @UseFilters(GoogleOAuthExceptionFilter)
  @UseGuards(GoogleCallbackAuthGuard)
  @Get('google/callback')
  async callback(
    @Req() request: GoogleAuthenticatedRequest,
    @Res() response: Response,
  ) {
    const result = await this.authService.login(request.user);
    response.cookie(this.refreshCookieName, result.refreshToken, {
      httpOnly: true,
      secure: (process.env.APP_ENV || process.env.NODE_ENV) === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.redirect(
      303,
      `${getGoogleFrontendCallbackUrl()}?google_success=1`,
    );
  }
}
