import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { getGoogleFrontendCallbackUrl } from '../google-oauth.config';
import { GOOGLE_OAUTH_STATE_COOKIE } from '../guards/google-auth.guard';

@Catch()
export class GoogleOAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GoogleOAuthExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    this.logger.warn(
      `Google OAuth failed: ${
        exception instanceof Error ? exception.message : 'unknown error'
      }`,
    );

    response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, {
      httpOnly: true,
      secure: (process.env.APP_ENV || process.env.NODE_ENV) === 'production',
      sameSite: 'lax',
      path: '/auth/google/callback',
    });
    response.redirect(303, `${getGoogleFrontendCallbackUrl()}?google_error=1`);
  }
}
