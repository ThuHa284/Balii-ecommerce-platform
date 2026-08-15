import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { GoogleAccountService } from '../google-account.service';
import { getGoogleCallbackUrl } from '../google-oauth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly googleAccountService: GoogleAccountService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'google-oauth-not-configured',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || 'google-oauth-not-configured',
      callbackURL: getGoogleCallbackUrl(),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0];

    return this.googleAccountService.validate({
      providerUserId: profile.id,
      email: email?.value ?? profile._json.email ?? '',
      emailVerified: email?.verified ?? profile._json.email_verified ?? false,
      fullName: profile.displayName || profile._json.name || '',
      avatarUrl: profile.photos?.[0]?.value || profile._json.picture,
    });
  }
}
