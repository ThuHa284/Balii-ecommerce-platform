export type RouteTarget = {
  prefix: string;
  targetEnv: string;
};

export const ROUTE_TARGETS: RouteTarget[] = [
  { prefix: '/auth', targetEnv: 'USER_SERVICE_URL' },
  { prefix: '/users', targetEnv: 'USER_SERVICE_URL' },
  { prefix: '/products', targetEnv: 'PRODUCT_SERVICE_URL' },
  { prefix: '/categories', targetEnv: 'PRODUCT_SERVICE_URL' },
  { prefix: '/cart', targetEnv: 'CART_SERVICE_URL' },
  { prefix: '/orders', targetEnv: 'ORDER_SERVICE_URL' },
  { prefix: '/payments', targetEnv: 'PAYMENT_SERVICE_URL' },
  { prefix: '/try-on', targetEnv: 'TRYON_SERVICE_URL' },
  { prefix: '/market-analysis', targetEnv: 'MARKET_ANALYSIS_SERVICE_URL' },
];

export const GATEWAY_TIMEOUT_MS = 15000;
