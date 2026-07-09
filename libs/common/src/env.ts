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
