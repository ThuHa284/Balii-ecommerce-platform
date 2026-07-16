#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_API_BASE_URL || 'https://api.ntthuha.id.vn').replace(/\/$/, '');
const mode = process.argv.find((value) => value.startsWith('--mode='))?.split('=')[1] || 'smoke';
const results = [];
const reportPath = process.env.PROD_API_REPORT_PATH || 'artifacts/production-api-report.json';
const timeoutMs = Number(process.env.PROD_API_TIMEOUT_MS || 30_000);

async function request(name, endpoint, options = {}) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const headers = new Headers(options.headers);
  headers.set('x-request-id', `prod-api-${crypto.randomUUID()}`);
  if (options.json !== undefined) headers.set('content-type', 'application/json');
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.json === undefined ? undefined : JSON.stringify(options.json),
      signal: controller.signal,
    });
    const body = await response.text();
    const expected = options.expected || [200];
    const result = {
      name,
      method: options.method || 'GET',
      endpoint,
      expected,
      status: response.status,
      passed: expected.includes(response.status),
      durationMs: Date.now() - startedAt,
      responsePreview: body.slice(0, 300),
    };
    results.push(result);
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.method} ${endpoint} -> ${result.status}`);
    return { response, body };
  } catch (error) {
    const result = {
      name, method: options.method || 'GET', endpoint, expected: options.expected || [200],
      status: null, passed: false, durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    results.push(result);
    console.log(`FAIL ${result.method} ${endpoint} -> ${result.error}`);
    return { response: null, body: '' };
  } finally {
    clearTimeout(timeout);
  }
}

function headers(session, role) {
  return {
    authorization: `Bearer ${session.accessToken}`,
    'x-user-id': session.userId,
    ...(role ? { 'x-user-role': role } : {}),
  };
}

async function login(label, emailKey, passwordKey) {
  const email = process.env[emailKey];
  const password = process.env[passwordKey];
  if (!email || !password) {
    console.log(`SKIP ${label}: credentials are not configured`);
    return null;
  }
  const { response, body } = await request(`${label} login`, '/auth/login', {
    method: 'POST', json: { email, password }, expected: [200, 201],
  });
  if (!response?.ok) return null;
  const payload = JSON.parse(body);
  const session = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    userId: payload.user?.id || payload.userId,
  };
  if (!session.accessToken || !session.refreshToken || !session.userId) {
    results.push({ name: `${label} login payload`, passed: false, error: 'Missing token or user id' });
    return null;
  }
  return session;
}

async function smoke() {
  const routes = [
    ['gateway health', '/health'], ['gateway liveness', '/health/live'], ['gateway readiness', '/health/ready'],
    ['auth health', '/auth/test'], ['locations provinces', '/locations/provinces'],
    ['products', '/products'], ['product recommendations', '/products/recommend?gender=unisex&ageGroup=18_25'],
    ['categories', '/categories'], ['collections', '/collections'], ['campaigns', '/campaigns'],
    ['active campaigns', '/campaigns/active'], ['vouchers', '/vouchers'],
    ['chatbot health', '/chatbot/health'], ['market analysis products', '/market-analysis/products'],
  ];
  for (const [name, endpoint] of routes) await request(name, endpoint);
  await request('users me requires authentication', '/users/me', { expected: [401] });
  await request('orders identity contract', '/orders', { expected: [400, 401] });
  await request('try-on history identity contract', '/try-on/history', { expected: [400, 401] });
}

async function authenticatedReads() {
  const customer = await login('customer', 'PROD_TEST_CUSTOMER_EMAIL', 'PROD_TEST_CUSTOMER_PASSWORD');
  if (customer) {
    const customerHeaders = headers(customer);
    const checks = [
      ['customer profile', '/users/me'], ['customer addresses', '/users/me/addresses'],
      ['customer cart', '/cart'], ['customer cart validation', '/cart/validate', 'POST'],
      ['customer orders', '/orders'], ['customer vouchers', '/vouchers/me'],
      ['customer voucher usages', '/vouchers/usages/me'], ['customer try-on history', '/try-on/history'],
      ['customer try-on stats', '/try-on/stats'],
    ];
    for (const [name, endpoint, method] of checks) {
      await request(name, endpoint, { method: method || 'GET', headers: customerHeaders, expected: [200, 201] });
    }
    await request('customer refresh token', '/auth/refresh', {
      method: 'POST', json: { userId: customer.userId, refreshToken: customer.refreshToken }, expected: [200, 201],
    });
  }

  const admin = await login('admin', 'PROD_TEST_ADMIN_EMAIL', 'PROD_TEST_ADMIN_PASSWORD');
  if (admin) {
    const adminHeaders = headers(admin, 'ADMIN');
    for (const [name, endpoint] of [
      ['admin users', '/users'], ['admin vouchers', '/admin/vouchers'], ['admin orders', '/orders/admin/orders'],
      ['admin dashboard', '/orders/admin/dashboard'], ['admin analytics', '/orders/admin/analytics'],
      ['admin refunds', '/payments/admin/refunds'],
    ]) await request(name, endpoint, { headers: adminHeaders });
  }
}

async function fixtureReads() {
  const fixtures = [
    ['product detail', process.env.PROD_TEST_PRODUCT_ID && `/products/${process.env.PROD_TEST_PRODUCT_ID}`],
    ['product slug', process.env.PROD_TEST_PRODUCT_SLUG && `/products/slug/${encodeURIComponent(process.env.PROD_TEST_PRODUCT_SLUG)}`],
    ['product variants', process.env.PROD_TEST_PRODUCT_ID && `/products/${process.env.PROD_TEST_PRODUCT_ID}/variants`],
    ['product images', process.env.PROD_TEST_PRODUCT_ID && `/products/${process.env.PROD_TEST_PRODUCT_ID}/images`],
    ['variant detail', process.env.PROD_TEST_VARIANT_ID && `/variants/${process.env.PROD_TEST_VARIANT_ID}`],
    ['variant snapshot', process.env.PROD_TEST_VARIANT_ID && `/products/variants/${process.env.PROD_TEST_VARIANT_ID}/snapshot`],
    ['collection slug', process.env.PROD_TEST_COLLECTION_SLUG && `/collections/slug/${encodeURIComponent(process.env.PROD_TEST_COLLECTION_SLUG)}`],
    ['campaign slug', process.env.PROD_TEST_CAMPAIGN_SLUG && `/campaigns/slug/${encodeURIComponent(process.env.PROD_TEST_CAMPAIGN_SLUG)}`],
  ];
  for (const [name, endpoint] of fixtures) if (endpoint) await request(name, endpoint);
}

if (!['smoke', 'read'].includes(mode)) throw new Error('Use --mode=smoke or --mode=read');
await smoke();
if (mode === 'read') {
  await authenticatedReads();
  await fixtureReads();
}
const report = { baseUrl, mode, generatedAt: new Date().toISOString(), results };
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const failed = results.filter((result) => !result.passed).length;
console.log(`Summary: ${results.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
