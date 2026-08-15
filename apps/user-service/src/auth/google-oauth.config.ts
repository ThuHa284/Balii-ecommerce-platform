const DEFAULT_GATEWAY_URL = 'http://localhost:4000';
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

function firstConfiguredUrl(value: string | undefined, fallback: string) {
  return (value || fallback).split(',')[0].trim().replace(/\/$/, '');
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function getGoogleCallbackUrl(): string {
  if (process.env.GOOGLE_CALLBACK_URL?.trim()) {
    return process.env.GOOGLE_CALLBACK_URL.trim();
  }

  const gatewayUrl = firstConfiguredUrl(
    process.env.API_GATEWAY_PUBLIC_URL,
    DEFAULT_GATEWAY_URL,
  );
  return `${gatewayUrl}/auth/google/callback`;
}

export function getGoogleFrontendCallbackUrl(): string {
  const frontendUrl = firstConfiguredUrl(
    process.env.FRONTEND_URL || process.env.APP_URL,
    DEFAULT_FRONTEND_URL,
  );
  return `${frontendUrl}/login`;
}
