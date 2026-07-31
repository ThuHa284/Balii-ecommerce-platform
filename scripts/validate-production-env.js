const fs = require('fs');
const path = require('path');

const envFileArg = process.argv[2] || '.env.production';
const envPath = path.resolve(process.cwd(), envFileArg);

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'FRONTEND_URL',
  'API_GATEWAY_PUBLIC_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SOCKET_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'INTERNAL_SERVICE_SECRET',
  'GATEWAY_SERVICE_SECRET',
  'PAYMENT_WEBHOOK_SHARED_SECRET',
  'USER_SERVICE_URL',
  'PRODUCT_SERVICE_URL',
  'CART_SERVICE_URL',
  'ORDER_SERVICE_URL',
  'PAYMENT_SERVICE_URL',
  'VOUCHER_SERVICE_URL',
  'TRYON_SERVICE_URL',
  'MARKET_ANALYSIS_SERVICE_URL',
  'CHATBOT_SERVICE_URL',
  'VNPAY_ENVIRONMENT',
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'VNPAY_PAYMENT_URL',
  'VNPAY_RETURN_URL',
  'VNPAY_IPN_URL',
];

const SUGGESTED_KEYS = [
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_USER',
  'MAIL_PASS',
  'MAIL_FROM',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'PAYMENT_PUBLIC_RETURN_URL',
  'SERPAPI_KEY',
  'GEMINI_API_KEY',
  'FASHN_API_KEY',
  'QDRANT_URL',
];

const PLACEHOLDER_PATTERNS = [
  /^change_me$/i,
  /^replace_me$/i,
  /^replace_with_/i,
  /^example\.com$/i,
  /^https:\/\/api\.example\.com$/i,
  /^https:\/\/shop\.example\.com$/i,
  /^ops@example\.com$/i,
  /^mailer@example\.com$/i,
];

const MINIMUM_SECRET_LENGTHS = {
  DB_PASSWORD: 16,
  JWT_SECRET: 32,
  JWT_REFRESH_SECRET: 32,
  INTERNAL_SERVICE_SECRET: 32,
  GATEWAY_SERVICE_SECRET: 32,
  PAYMENT_WEBHOOK_SHARED_SECRET: 32,
  VNPAY_HASH_SECRET: 32,
};

function parseEnvFile(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
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

    values[key] = value;
  }

  return values;
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

if (!fs.existsSync(envPath)) {
  console.error(`Khong tim thay file env: ${envPath}`);
  process.exit(1);
}

const env = parseEnvFile(fs.readFileSync(envPath, 'utf8'));

const missingRequired = REQUIRED_KEYS.filter((key) => !env[key]?.trim());
const placeholderRequired = REQUIRED_KEYS.filter(
  (key) => env[key]?.trim() && isPlaceholder(env[key].trim()),
);
const placeholderSuggested = SUGGESTED_KEYS.filter(
  (key) => env[key]?.trim() && isPlaceholder(env[key].trim()),
);
const missingSuggested = SUGGESTED_KEYS.filter((key) => !env[key]?.trim());

const problems = [];
const warnings = [];
const isThesisDemo = env.DEPLOYMENT_PROFILE === 'thesis-demo';

for (const [key, minimumLength] of Object.entries(MINIMUM_SECRET_LENGTHS)) {
  const value = env[key]?.trim();
  if (value && !isPlaceholder(value) && value.length < minimumLength) {
    const message = `${key} phải có ít nhất ${minimumLength} ký tự.`;
    if (isThesisDemo && key === 'DB_PASSWORD') {
      warnings.push(
        `${message} Chưa tự đổi để tránh làm gián đoạn PostgreSQL hiện tại.`,
      );
    } else {
      problems.push(message);
    }
  }
}

if (
  env.TRUST_PROXY_HOPS &&
  (!/^\d+$/.test(env.TRUST_PROXY_HOPS) || Number(env.TRUST_PROXY_HOPS) > 5)
) {
  problems.push('TRUST_PROXY_HOPS phải là số nguyên từ 0 đến 5.');
}

if (missingRequired.length) {
  problems.push('Bien bat buoc dang thieu:');
  for (const key of missingRequired) {
    problems.push(`- ${key}`);
  }
}

if (placeholderRequired.length) {
  problems.push('Bien bat buoc dang de gia tri mau/placeholder:');
  for (const key of placeholderRequired) {
    problems.push(`- ${key}=${env[key]}`);
  }
}

if (placeholderSuggested.length) {
  problems.push('Bien khuyen nghi nen thay gia tri mau truoc khi production:');
  for (const key of placeholderSuggested) {
    problems.push(`- ${key}=${env[key]}`);
  }
}

if (env.SERPAPI_API_KEY && !env.SERPAPI_KEY) {
  problems.push('Dang co SERPAPI_API_KEY nhung code hien tai doc SERPAPI_KEY.');
}

if (
  env.NEXT_PUBLIC_API_URL &&
  env.NEXT_PUBLIC_API_URL.includes('localhost') &&
  env.APP_ENV === 'production'
) {
  problems.push(
    'NEXT_PUBLIC_API_URL dang tro localhost trong khi APP_ENV=production.',
  );
}

if (
  env.NEXT_PUBLIC_SOCKET_URL &&
  env.NEXT_PUBLIC_SOCKET_URL.includes('localhost') &&
  env.APP_ENV === 'production'
) {
  problems.push(
    'NEXT_PUBLIC_SOCKET_URL dang tro localhost trong khi APP_ENV=production.',
  );
}

if (
  env.FRONTEND_URL &&
  env.FRONTEND_URL.includes('localhost') &&
  env.APP_ENV === 'production'
) {
  problems.push(
    'FRONTEND_URL dang tro localhost trong khi APP_ENV=production.',
  );
}

if (env.APP_ENV === 'production' && !isThesisDemo) {
  if (env.PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS !== 'false') {
    problems.push(
      'PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS phải là false trên production.',
    );
  }

  if (env.PAYMENT_SIMULATION_ALLOW_PRODUCTION !== 'false') {
    problems.push(
      'PAYMENT_SIMULATION_ALLOW_PRODUCTION phải là false trên production.',
    );
  }

  if (env.DISABLE_EMAIL_VERIFICATION === 'true') {
    problems.push('DISABLE_EMAIL_VERIFICATION phải là false trên production.');
  }
  for (const key of [
    'MAIL_HOST',
    'MAIL_PORT',
    'MAIL_USER',
    'MAIL_PASS',
    'MAIL_FROM',
  ]) {
    if (!env[key]?.trim() || isPlaceholder(env[key].trim())) {
      problems.push(
        `${key} phải được cấu hình thật khi xác minh email đang bật.`,
      );
    }
  }

  if (env.VNPAY_ENVIRONMENT !== 'production') {
    problems.push(
      'VNPAY_ENVIRONMENT phải là production trước khi nhận thanh toán thật.',
    );
  }

  if (env.VNPAY_PAYMENT_URL?.toLowerCase().includes('sandbox')) {
    problems.push(
      'VNPAY_PAYMENT_URL vẫn đang trỏ tới sandbox; cần dùng URL production do VNPay cấp.',
    );
  }

  for (const key of ['VNPAY_RETURN_URL', 'VNPAY_IPN_URL']) {
    if (env[key] && !env[key].startsWith('https://')) {
      problems.push(`${key} phải là URL HTTPS công khai trên production.`);
    }
  }

  if (env.PAYMENT_SIMULATION_ENABLED !== 'false') {
    problems.push('PAYMENT_SIMULATION_ENABLED phải là false trên production.');
  }
  if (env.PAYMENT_REFUND_SIMULATION_ENABLED !== 'false') {
    problems.push(
      'PAYMENT_REFUND_SIMULATION_ENABLED phải là false trên production.',
    );
  }
  if (env.NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION !== 'false') {
    problems.push(
      'NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION phải là false trên production.',
    );
  }
}

if (env.APP_ENV === 'production' && isThesisDemo) {
  if (env.PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS !== 'false') {
    problems.push(
      'PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS phải là false kể cả trong profile thesis-demo.',
    );
  }

  warnings.push(
    'Đang dùng profile thesis-demo: cho phép VNPay sandbox, mô phỏng thanh toán, bỏ qua xác minh email và mô phỏng hoàn tiền.',
  );
}

if (problems.length) {
  console.error(`Kiem tra env that bai: ${envFileArg}`);
  console.error(problems.join('\n'));
  console.error(
    `\nLenh deploy dung:\nAPP_ENV_FILE=${envFileArg} docker compose --env-file ${envFileArg} -f docker-compose.prod.yml up --build -d`,
  );
  process.exit(1);
}

console.log(`Env hop le o muc co the deploy baseline: ${envFileArg}`);

if (warnings.length) {
  console.warn('\nCảnh báo triển khai:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (missingSuggested.length) {
  console.log('\nBien tuy chon/chuc nang nang cao chua dien:');
  for (const key of missingSuggested) {
    console.log(`- ${key}`);
  }
}

console.log(
  `\nLenh deploy:\nAPP_ENV_FILE=${envFileArg} docker compose --env-file ${envFileArg} -f docker-compose.prod.yml up --build -d`,
);
