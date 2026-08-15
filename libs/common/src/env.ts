import { existsSync } from 'fs';
import { config as loadDotenv } from 'dotenv';

export type AppEnv = 'local' | 'production';

let envLoaded = false;

export function getAppEnv(): AppEnv {
  const rawValue = (
    process.env.APP_ENV ||
    process.env.NODE_ENV ||
    'local'
  ).toLowerCase();

  return rawValue === 'production' ? 'production' : 'local';
}

export function isProduction(): boolean {
  return getAppEnv() === 'production';
}

/**
 * TypeORM logging config. Full query+parameter logging is useful in dev but
 * leaks customer/order data into stdout in production, so restrict prod logs
 * to errors only. Set DB_LOGGING=true to force verbose logging anywhere.
 */
export function getDbLogging(): boolean | ['error'] {
  if (process.env.DB_LOGGING === 'true') return true;
  return isProduction() ? ['error'] : true;
}

/**
 * CORS options for internal microservices. These sit behind the API gateway on
 * a private network and are additionally guarded by trustedServiceMiddleware,
 * so browsers should never talk to them directly. We still restrict the allowed
 * origins to FRONTEND_URL instead of reflecting any origin (defense in depth).
 */
export function getInternalCorsOrigins(): string[] {
  return (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveEnvFilePaths(): string[] {
  const appEnv = getAppEnv();
  const envFiles = ['.env', `.env.${appEnv}`];

  return envFiles.filter((filePath) => existsSync(filePath));
}

export function loadEnv() {
  if (envLoaded) {
    return resolveEnvFilePaths();
  }

  for (const filePath of resolveEnvFilePaths()) {
    loadDotenv({
      path: filePath,
      override: true,
    });
  }

  envLoaded = true;

  return resolveEnvFilePaths();
}

export function getSecuritySecret(
  variableName: string,
  developmentFallback: string,
): string {
  loadEnv();
  const value = process.env[variableName]?.trim();
  if (value) return value;

  if (getAppEnv() === 'production') {
    throw new Error(`${variableName} is required in production`);
  }

  return developmentFallback;
}
