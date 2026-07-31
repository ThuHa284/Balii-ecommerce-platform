import fs from 'fs';
import type { NextConfig } from 'next';
import path from 'path';

function loadRootEnv() {
  const rootEnvPath = path.resolve(__dirname, '..', '.env');

  if (!fs.existsSync(rootEnvPath)) {
    return;
  }

  const envFile = fs.readFileSync(rootEnvPath, 'utf8');

  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const defaultApiUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://api.ntthuha.id.vn'
    : `http://localhost:${process.env.API_GATEWAY_PORT || '4000'}`;
const defaultSocketUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://api.ntthuha.id.vn'
    : 'http://localhost:4006';

process.env.NEXT_PUBLIC_API_URL ??=
  process.env.API_GATEWAY_URL || defaultApiUrl;
process.env.NEXT_PUBLIC_SOCKET_URL ??=
  process.env.TRYON_SERVICE_URL || defaultSocketUrl;

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;
const publicSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || defaultSocketUrl;
const publicWebSocketUrl = publicSocketUrl.replace(/^http/, 'ws');

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://via.placeholder.com https://placehold.co",
      "font-src 'self' data:",
      `connect-src 'self' ${publicApiUrl} ${publicSocketUrl} ${publicWebSocketUrl} https://res.cloudinary.com`,
      "media-src 'self' blob: https://res.cloudinary.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      isProduction ? 'upgrade-insecure-requests' : '',
    ]
      .filter(Boolean)
      .join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
