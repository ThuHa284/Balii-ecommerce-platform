import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

import { isGoogleOAuthConfigured } from '../google-oauth.config';

export const GOOGLE_OAUTH_STATE_COOKIE = 'balii_google_oauth_state';

type GoogleOAuthRequest = Request & {
  googleOAuthState?: string;
};

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: (process.env.APP_ENV || process.env.NODE_ENV) === 'production',
    sameSite: 'lax' as const,
    path: '/auth/google/callback',
  };
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  const item = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

function hashState(state: string): string {
  return createHash('sha256').update(state).digest('hex');
}

function statesMatch(suppliedState: string, savedStateHash: string): boolean {
  const supplied = Buffer.from(hashState(suppliedState));
  const expected = Buffer.from(savedStateHash);

  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

function ensureGoogleOAuthConfigured() {
  if (!isGoogleOAuthConfigured()) {
    throw new ServiceUnavailableException(
      'Google OAuth chua duoc cau hinh tren may chu',
    );
  }
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    ensureGoogleOAuthConfigured();

    const request = context.switchToHttp().getRequest<GoogleOAuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const state = randomBytes(32).toString('hex');

    request.googleOAuthState = state;
    response.cookie(GOOGLE_OAUTH_STATE_COOKIE, hashState(state), {
      ...stateCookieOptions(),
      maxAge: 10 * 60 * 1000,
    });

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<GoogleOAuthRequest>();

    return {
      session: false,
      state: request.googleOAuthState,
      prompt: 'select_account',
    };
  }
}

@Injectable()
export class GoogleCallbackAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    ensureGoogleOAuthConfigured();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const suppliedState =
      typeof request.query.state === 'string' ? request.query.state : '';
    const savedStateHash =
      readCookie(request.headers.cookie, GOOGLE_OAUTH_STATE_COOKIE) ?? '';

    response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, stateCookieOptions());

    if (
      !suppliedState ||
      !savedStateHash ||
      !statesMatch(suppliedState, savedStateHash)
    ) {
      throw new ServiceUnavailableException(
        'Trang thai Google OAuth khong hop le hoac da het han',
      );
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions() {
    return { session: false };
  }
}
