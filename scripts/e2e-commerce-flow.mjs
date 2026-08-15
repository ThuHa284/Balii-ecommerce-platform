#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (
  process.env.E2E_API_BASE_URL || 'http://localhost:4000'
).replace(/\/$/, '');
const reportPath =
  process.env.E2E_REPORT_PATH || 'artifacts/e2e-commerce-report.json';
const checks = [];

function check(name, condition, details = {}) {
  checks.push({ name, passed: Boolean(condition), ...details });
  if (!condition) {
    throw new Error(`${name}: ${JSON.stringify(details)}`);
  }
  console.log(`PASS ${name}`);
}

async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers);
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  if (options.json !== undefined)
    headers.set('content-type', 'application/json');

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  const expected = options.expected || [200, 201];
  if (!expected.includes(response.status)) {
    throw new Error(
      `${options.method || 'GET'} ${endpoint} returned ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  return body?.data ?? body;
}

async function login(email, password) {
  const body = await request('/auth/login', {
    method: 'POST',
    json: { email, password },
  });
  check(`đăng nhập ${email}`, Boolean(body.accessToken && body.user?.id));
  return body;
}

const customerEmail = process.env.E2E_CUSTOMER_EMAIL || 'customer@balii.com';
const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@balii.com';
const password = process.env.E2E_PASSWORD || '123456';
const address = {
  recipientName: 'Khách hàng E2E',
  phone: '0900000003',
  provinceId: 5,
  districtId: 1,
  wardId: 1,
  streetAddress: '1 Đường kiểm thử E2E',
};

let failure;
let cleanupAdminToken;
const inventoryRestores = [];
const campaignCleanups = [];
const orderCleanups = [];
try {
  const customer = await login(customerEmail.toUpperCase(), password);
  const admin = await login(adminEmail, password);
  const customerToken = customer.accessToken;
  const adminToken = admin.accessToken;
  cleanupAdminToken = adminToken;
  const suffix = Date.now();
  const now = Date.now();
  const products = await request('/products');
  const saleProduct = products.find((product) =>
    product.variants?.some(
      (variant) =>
        variant.salePrice != null &&
        Number(variant.salePrice) < Number(variant.price),
    ),
  );
  check('tìm được sản phẩm sale để kiểm tra campaign', Boolean(saleProduct));
  const saleVariant = saleProduct.variants.find(
    (variant) =>
      variant.salePrice != null &&
      Number(variant.salePrice) < Number(variant.price),
  );
  const saleSnapshot = await request(
    `/products/variants/${saleVariant.id}/snapshot`,
  );
  const nonStackCampaign = await request('/campaigns', {
    method: 'POST',
    token: adminToken,
    json: {
      name: `E2E campaign không chồng sale ${suffix}`,
      slug: `e2e-non-stack-sale-${suffix}`,
      productIds: [saleProduct.id],
      discountType: 'PERCENT',
      discountValue: 5,
      stackableWithSale: false,
      startAt: new Date(now - 60_000).toISOString(),
      endAt: new Date(now + 86_400_000).toISOString(),
      priorityOrder: 10000,
      isActive: true,
    },
  });
  const nonStackSnapshot = await request(
    `/products/variants/${saleVariant.id}/snapshot`,
  );
  check(
    'campaign không chồng sale không làm tăng giá',
    nonStackSnapshot.unitPrice === saleSnapshot.unitPrice,
    { before: saleSnapshot.unitPrice, after: nonStackSnapshot.unitPrice },
  );
  await request(`/campaigns/${nonStackCampaign.id}`, {
    method: 'PATCH',
    token: adminToken,
    json: { isActive: false },
  });

  const stackCampaign = await request('/campaigns', {
    method: 'POST',
    token: adminToken,
    json: {
      name: `E2E campaign chồng sale ${suffix}`,
      slug: `e2e-stack-sale-${suffix}`,
      productIds: [saleProduct.id],
      discountType: 'PERCENT',
      discountValue: 10,
      stackableWithSale: true,
      startAt: new Date(now - 60_000).toISOString(),
      endAt: new Date(now + 86_400_000).toISOString(),
      priorityOrder: 10001,
      isActive: true,
    },
  });
  const stackSnapshot = await request(
    `/products/variants/${saleVariant.id}/snapshot`,
  );
  const expectedStackPrice =
    Math.round(saleSnapshot.unitPrice * 0.9 * 100) / 100;
  check(
    'campaign được phép chồng sale tính trên giá sale',
    stackSnapshot.unitPrice === expectedStackPrice,
    { actual: stackSnapshot.unitPrice, expected: expectedStackPrice },
  );
  await request(`/campaigns/${stackCampaign.id}`, {
    method: 'PATCH',
    token: adminToken,
    json: { isActive: false },
  });

  const freeShippingMinimum = Number(
    process.env.E2E_FREE_SHIPPING_MIN_AMOUNT || 500000,
  );
  const fixture = products
    .filter((product) => product.variants?.length >= 2)
    .map((product) => ({
      product,
      effectivePrice: Number(
        product.variants[0].salePrice ?? product.variants[0].price,
      ),
    }))
    .filter(
      ({ effectivePrice }) =>
        effectivePrice > 50000 &&
        effectivePrice < freeShippingMinimum &&
        Math.ceil(freeShippingMinimum / effectivePrice) <= 8,
    )
    .sort(
      (left, right) => right.effectivePrice - left.effectivePrice,
    )[0]?.product;
  check('tìm được sản phẩm fixture có ít nhất hai biến thể', Boolean(fixture));
  const productId = fixture.id;
  const buyVariantId = fixture.variants[0].id;
  const giftVariantId = fixture.variants[1].id;
  const originalBuyStock = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  const originalGiftStock = await request(
    `/products/variants/${giftVariantId}/snapshot`,
  );
  inventoryRestores.push(
    { variantId: buyVariantId, stockQuantity: originalBuyStock.stockQuantity },
    {
      variantId: giftVariantId,
      stockQuantity: originalGiftStock.stockQuantity,
    },
  );
  await request(`/variants/${buyVariantId}`, {
    method: 'PATCH',
    token: adminToken,
    json: {
      stockQuantity: Math.max(Number(originalBuyStock.stockQuantity), 8),
    },
  });
  await request(`/variants/${giftVariantId}`, {
    method: 'PATCH',
    token: adminToken,
    json: {
      stockQuantity: Math.max(Number(originalGiftStock.stockQuantity), 4),
    },
  });

  await request('/cart', {
    method: 'DELETE',
    token: customerToken,
  });

  const stockBeforeCod = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  const unitPrice = Number(stockBeforeCod.unitPrice);
  const paidShippingTotal = unitPrice + 30000;
  const paidShippingCart = await request('/cart/items', {
    method: 'POST',
    token: customerToken,
    json: { variantId: buyVariantId, quantity: 1 },
  });
  check(
    'cart tính phí ship từ database',
    paidShippingCart.shippingFee === 30000,
    {
      shippingFee: paidShippingCart.shippingFee,
    },
  );
  check(
    'cart tính đúng tổng có phí ship',
    paidShippingCart.totalAmount === paidShippingTotal,
    {
      totalAmount: paidShippingCart.totalAmount,
    },
  );

  const codPayload = {
    idempotencyKey: crypto.randomUUID(),
    paymentMethod: 'cod',
    shippingAddress: address,
  };
  const codOrder = await request('/orders', {
    method: 'POST',
    token: customerToken,
    json: codPayload,
  });
  orderCleanups.push(codOrder.id);
  check('order tự tính lại cùng phí ship', codOrder.shippingFee === 30000, {
    shippingFee: codOrder.shippingFee,
  });
  check(
    'order COD giữ đúng tổng tiền',
    codOrder.totalAmount === paidShippingTotal,
    {
      totalAmount: codOrder.totalAmount,
      expected: paidShippingTotal,
    },
  );

  const codPayment = await request('/payments', {
    method: 'POST',
    token: customerToken,
    json: { orderId: codOrder.id, method: 'cod' },
  });
  const reservedCod = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  check('tạo đơn chỉ giữ chỗ tồn kho', reservedCod.reservedQuantity === 1, {
    reservedQuantity: reservedCod.reservedQuantity,
  });

  await request(`/orders/admin/orders/${codOrder.id}/status`, {
    method: 'PATCH',
    token: adminToken,
    json: { status: 'cancelled', note: 'E2E cancellation' },
  });
  const cancelledOrder = await request(`/orders/${codOrder.id}`, {
    token: customerToken,
  });
  const stockAfterCancel = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  const cancelledPayment = await request(`/payments/${codPayment.id}`, {
    token: customerToken,
  });
  check(
    'hủy đơn giải phóng reserved stock',
    stockAfterCancel.reservedQuantity === 0,
    {
      reservedQuantity: stockAfterCancel.reservedQuantity,
    },
  );
  check(
    'hủy đơn chưa trả tiền không làm giảm stock',
    stockAfterCancel.stockQuantity === stockBeforeCod.stockQuantity,
    {
      before: stockBeforeCod.stockQuantity,
      after: stockAfterCancel.stockQuantity,
    },
  );
  check(
    'hủy đơn cập nhật trạng thái order',
    cancelledOrder.status === 'cancelled',
  );
  check(
    'hủy đơn cập nhật trạng thái payment',
    cancelledPayment.status === 'cancelled',
    {
      status: cancelledPayment.status,
    },
  );

  const giftCampaign = await request('/campaigns', {
    method: 'POST',
    token: adminToken,
    json: {
      name: `E2E Mua 2 tặng 1 ${suffix}`,
      slug: `e2e-buy-2-get-1-${suffix}`,
      productIds: [productId],
      discountType: 'GIFT',
      discountValue: 0,
      minimumPurchaseQuantity: 2,
      giftVariantId,
      giftQuantity: 1,
      giftUnitPrice: 0,
      repeatable: true,
      maxApplications: 3,
      stackableWithSale: true,
      startAt: new Date(now - 60_000).toISOString(),
      endAt: new Date(now + 86_400_000).toISOString(),
      priorityOrder: 100,
      isActive: true,
    },
  });
  campaignCleanups.push(giftCampaign.id);
  const voucherCode = `E2E${suffix}`;
  const createdVoucher = await request('/admin/vouchers', {
    method: 'POST',
    token: adminToken,
    json: {
      code: voucherCode,
      name: 'Voucher E2E 10%',
      description: 'Mô tả voucher E2E được lưu thật',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 100000,
      maxDiscount: 500000,
      usageLimit: 10,
      userLimitPerUser: 1,
      startDate: new Date(now - 60_000).toISOString(),
      endDate: new Date(now + 86_400_000).toISOString(),
      isActive: true,
    },
  });
  check(
    'admin lưu được đầy đủ cấu hình voucher',
    createdVoucher.name === 'Voucher E2E 10%' &&
      createdVoucher.description === 'Mô tả voucher E2E được lưu thật' &&
      createdVoucher.userLimitPerUser === 1,
    { voucher: createdVoucher },
  );

  const fixedCode = `FIXED${suffix}`;
  await request('/admin/vouchers', {
    method: 'POST',
    token: adminToken,
    json: {
      code: fixedCode,
      name: 'Voucher cố định E2E',
      discountType: 'fixed',
      discountValue: 50000,
      minOrderValue: 0,
      usageLimit: 10,
      userLimitPerUser: 2,
      startDate: new Date(now - 60_000).toISOString(),
      endDate: new Date(now + 86_400_000).toISOString(),
      isActive: true,
    },
  });
  const fixedValidation = await request('/vouchers/validate', {
    method: 'POST',
    token: customerToken,
    json: { code: fixedCode, orderAmount: unitPrice },
  });
  check(
    'voucher cố định trừ đúng số tiền',
    fixedValidation.discountAmount === 50000 &&
      fixedValidation.finalAmount === unitPrice - 50000,
    { validation: fixedValidation },
  );

  const cappedCode = `CAP${suffix}`;
  const cappedMaxDiscount = Math.max(1, Math.floor(unitPrice * 0.25));
  await request('/admin/vouchers', {
    method: 'POST',
    token: adminToken,
    json: {
      code: cappedCode,
      name: 'Voucher phần trăm có trần E2E',
      discountType: 'percent',
      discountValue: 50,
      minOrderValue: 0,
      maxDiscount: cappedMaxDiscount,
      usageLimit: 10,
      userLimitPerUser: 2,
      startDate: new Date(now - 60_000).toISOString(),
      endDate: new Date(now + 86_400_000).toISOString(),
      isActive: true,
    },
  });
  const cappedValidation = await request('/vouchers/validate', {
    method: 'POST',
    token: customerToken,
    json: { code: cappedCode, orderAmount: unitPrice },
  });
  check(
    'voucher phần trăm tôn trọng mức giảm tối đa',
    cappedValidation.discountAmount === cappedMaxDiscount &&
      cappedValidation.finalAmount === unitPrice - cappedMaxDiscount,
    { validation: cappedValidation },
  );

  const reusableCode = `REUSE${suffix}`;
  await request('/admin/vouchers', {
    method: 'POST',
    token: adminToken,
    json: {
      code: reusableCode,
      name: 'Voucher E2E khôi phục sau hủy đơn',
      discountType: 'fixed',
      discountValue: 10000,
      minOrderValue: 0,
      usageLimit: 2,
      userLimitPerUser: 1,
      startDate: new Date(now - 60_000).toISOString(),
      endDate: new Date(now + 86_400_000).toISOString(),
      isActive: true,
    },
  });
  await request('/cart', { method: 'DELETE', token: customerToken });
  await request('/cart/items', {
    method: 'POST',
    token: customerToken,
    json: { variantId: buyVariantId, quantity: 1 },
  });
  const firstVoucherOrder = await request('/orders', {
    method: 'POST',
    token: customerToken,
    json: {
      idempotencyKey: crypto.randomUUID(),
      paymentMethod: 'cod',
      shippingAddress: address,
      voucherCode: reusableCode,
    },
  });
  orderCleanups.push(firstVoucherOrder.id);
  const firstVoucherPayment = await request('/payments', {
    method: 'POST',
    token: customerToken,
    json: { orderId: firstVoucherOrder.id, method: 'cod' },
  });
  await request(`/orders/admin/orders/${firstVoucherOrder.id}/status`, {
    method: 'PATCH',
    token: adminToken,
    json: { status: 'cancelled', note: 'E2E voucher release 1' },
  });
  check('hủy đơn giải phóng lượt dùng voucher', true);

  await request('/cart', { method: 'DELETE', token: customerToken });
  await request('/cart/items', {
    method: 'POST',
    token: customerToken,
    json: { variantId: buyVariantId, quantity: 1 },
  });
  const secondVoucherOrder = await request('/orders', {
    method: 'POST',
    token: customerToken,
    json: {
      idempotencyKey: crypto.randomUUID(),
      paymentMethod: 'cod',
      shippingAddress: address,
      voucherCode: reusableCode,
    },
  });
  orderCleanups.push(secondVoucherOrder.id);
  check(
    'voucher giới hạn 1 lần/người dùng lại được sau khi hủy',
    secondVoucherOrder.discountAmount === 10000,
    { discountAmount: secondVoucherOrder.discountAmount },
  );
  await request(`/orders/admin/orders/${secondVoucherOrder.id}/status`, {
    method: 'PATCH',
    token: adminToken,
    json: { status: 'cancelled', note: 'E2E voucher release 2' },
  });
  const releasedVoucherPayment = await request(
    `/payments/${firstVoucherPayment.id}`,
    { token: customerToken },
  );
  check(
    'payment COD của đơn hủy được đồng bộ',
    releasedVoucherPayment.status === 'cancelled',
    { status: releasedVoucherPayment.status },
  );

  await request('/cart', { method: 'DELETE', token: customerToken });
  await request('/cart/items', {
    method: 'POST',
    token: customerToken,
    json: { variantId: buyVariantId, quantity: 1 },
  });
  const stockBeforeFailedPayment = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  const failedOrder = await request('/orders', {
    method: 'POST',
    token: customerToken,
    json: {
      idempotencyKey: crypto.randomUUID(),
      paymentMethod: 'vnpay',
      shippingAddress: address,
    },
  });
  orderCleanups.push(failedOrder.id);
  const failedPayment = await request('/payments', {
    method: 'POST',
    token: customerToken,
    json: { orderId: failedOrder.id, method: 'vnpay' },
  });
  await request(`/payments/${failedPayment.id}/fail`, {
    method: 'POST',
    token: adminToken,
  });
  const failedOrderResult = await request(`/orders/${failedOrder.id}`, {
    token: customerToken,
  });
  const failedPaymentResult = await request(`/payments/${failedPayment.id}`, {
    token: customerToken,
  });
  const stockAfterFailedPayment = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  check(
    'thanh toán thất bại tự hủy đơn chờ',
    failedOrderResult.status === 'cancelled' &&
      failedOrderResult.paymentStatus === 'failed',
    {
      orderStatus: failedOrderResult.status,
      paymentStatus: failedOrderResult.paymentStatus,
    },
  );
  check(
    'thanh toán thất bại giải phóng tồn kho',
    stockAfterFailedPayment.stockQuantity ===
      stockBeforeFailedPayment.stockQuantity &&
      stockAfterFailedPayment.reservedQuantity === 0,
    { before: stockBeforeFailedPayment, after: stockAfterFailedPayment },
  );
  check(
    'payment thất bại lưu đúng trạng thái',
    failedPaymentResult.status === 'failed',
    { status: failedPaymentResult.status },
  );

  await request('/cart', { method: 'DELETE', token: customerToken });
  const comboQuantity = Math.max(4, Math.ceil(freeShippingMinimum / unitPrice));
  const comboCart = await request('/cart/items', {
    method: 'POST',
    token: customerToken,
    json: { variantId: buyVariantId, quantity: comboQuantity },
  });
  const reward = comboCart.promotionItems?.find(
    (item) => item.variantId === giftVariantId,
  );
  const expectedRewardQuantity = Math.min(Math.floor(comboQuantity / 2), 3);
  check(
    'combo mua 2 tặng 1 lặp lại được',
    reward?.quantity === expectedRewardQuantity,
    {
      rewardQuantity: reward?.quantity,
      expectedRewardQuantity,
    },
  );
  const comboSubtotal = unitPrice * comboQuantity;
  check(
    'quà combo không làm tăng subtotal',
    comboCart.subtotal === comboSubtotal,
    {
      subtotal: comboCart.subtotal,
      expected: comboSubtotal,
    },
  );
  check('đơn vượt ngưỡng được miễn ship', comboCart.shippingFee === 0, {
    shippingFee: comboCart.shippingFee,
  });

  const buyBeforePaid = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  const giftBeforePaid = await request(
    `/products/variants/${giftVariantId}/snapshot`,
  );
  const vnpayPayload = {
    idempotencyKey: crypto.randomUUID(),
    paymentMethod: 'vnpay',
    shippingAddress: address,
    voucherCode,
  };
  const paidOrder = await request('/orders', {
    method: 'POST',
    token: customerToken,
    json: vnpayPayload,
  });
  orderCleanups.push(paidOrder.id);
  const expectedDiscount = Math.min(comboSubtotal * 0.1, 500000);
  const expectedPaidTotal = comboSubtotal - expectedDiscount;
  check(
    'voucher 10% được tính ở backend',
    paidOrder.discountAmount === expectedDiscount,
    {
      discountAmount: paidOrder.discountAmount,
    },
  );
  check(
    'tổng đơn combo + voucher chính xác',
    paidOrder.totalAmount === expectedPaidTotal,
    {
      totalAmount: paidOrder.totalAmount,
    },
  );
  check(
    'order lưu cả dòng quà combo',
    paidOrder.items.some(
      (item) =>
        item.campaignDiscountType === 'GIFT' &&
        item.quantity === expectedRewardQuantity,
    ),
  );

  const replayOrder = await request('/orders', {
    method: 'POST',
    token: customerToken,
    json: vnpayPayload,
  });
  check('idempotency order trả lại cùng đơn', replayOrder.id === paidOrder.id, {
    first: paidOrder.id,
    replay: replayOrder.id,
  });

  const payment = await request('/payments', {
    method: 'POST',
    token: customerToken,
    json: { orderId: paidOrder.id, method: 'vnpay' },
  });
  const replayPayment = await request('/payments', {
    method: 'POST',
    token: customerToken,
    json: { orderId: paidOrder.id, method: 'vnpay' },
  });
  check(
    'idempotency payment trả lại cùng payment',
    replayPayment.id === payment.id,
    {
      first: payment.id,
      replay: replayPayment.id,
    },
  );
  check(
    'VNPay giả lập tạo URL riêng',
    payment.paymentUrl?.includes('simulation=true'),
    {
      paymentUrl: payment.paymentUrl,
    },
  );

  await request(`/payments/${payment.id}/simulate-success`, {
    method: 'POST',
    token: customerToken,
  });
  const paidResult = await request(`/orders/${paidOrder.id}`, {
    token: customerToken,
  });
  const buyAfterPaid = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  const giftAfterPaid = await request(
    `/products/variants/${giftVariantId}/snapshot`,
  );
  check(
    'thanh toán giả lập xác nhận order',
    paidResult.status === 'confirmed',
    {
      status: paidResult.status,
    },
  );
  check(
    'thanh toán giả lập đánh dấu paid',
    paidResult.paymentStatus === 'paid',
    {
      paymentStatus: paidResult.paymentStatus,
    },
  );
  check(
    'thanh toán commit đúng tồn kho hàng mua',
    buyAfterPaid.stockQuantity ===
      buyBeforePaid.stockQuantity - comboQuantity &&
      buyAfterPaid.reservedQuantity === 0,
    { before: buyBeforePaid, after: buyAfterPaid },
  );
  check(
    'thanh toán commit đúng tồn kho quà tặng',
    giftAfterPaid.stockQuantity ===
      giftBeforePaid.stockQuantity - expectedRewardQuantity &&
      giftAfterPaid.reservedQuantity === 0,
    { before: giftBeforePaid, after: giftAfterPaid },
  );

  const replaySuccess = await request(
    `/payments/${payment.id}/simulate-success`,
    {
      method: 'POST',
      token: customerToken,
    },
  );
  check(
    'callback thành công lặp lại không trừ tồn kho lần hai',
    replaySuccess.status === 'paid',
  );
  const buyAfterReplay = await request(
    `/products/variants/${buyVariantId}/snapshot`,
  );
  check(
    'tồn kho giữ nguyên sau callback lặp',
    buyAfterReplay.stockQuantity === buyAfterPaid.stockQuantity,
  );

  await request(`/orders/admin/orders/${paidOrder.id}/status`, {
    method: 'PATCH',
    token: adminToken,
    json: { status: 'cancelled', note: 'must be blocked' },
    expected: [409],
  });
  check('không cho hủy trực tiếp đơn đã thanh toán', true);
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  console.error(`FAIL ${failure}`);
} finally {
  const cleanupErrors = [];
  if (cleanupAdminToken) {
    for (const orderId of orderCleanups) {
      try {
        await request(`/orders/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          token: cleanupAdminToken,
          json: { status: 'cancelled', note: 'E2E automatic cleanup' },
          expected: [200, 201, 400, 409],
        });
      } catch (error) {
        cleanupErrors.push(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    for (const campaignId of campaignCleanups) {
      try {
        await request(`/campaigns/${campaignId}`, {
          method: 'PATCH',
          token: cleanupAdminToken,
          json: { isActive: false },
        });
      } catch (error) {
        cleanupErrors.push(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    for (const restore of inventoryRestores) {
      try {
        await request(`/variants/${restore.variantId}`, {
          method: 'PATCH',
          token: cleanupAdminToken,
          json: { stockQuantity: restore.stockQuantity },
        });
      } catch (error) {
        cleanupErrors.push(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
  if (!cleanupErrors.length && inventoryRestores.length) {
    check('E2E khôi phục tồn kho và tắt campaign fixture', true);
  } else if (cleanupErrors.length) {
    const cleanupFailure = `E2E cleanup failed: ${cleanupErrors.join('; ')}`;
    failure = failure ? `${failure}; ${cleanupFailure}` : cleanupFailure;
    console.error(`FAIL ${cleanupFailure}`);
  }
  const report = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    passed: !failure,
    failure,
    checks,
  };
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (failure) process.exitCode = 1;
else console.log(`Summary: ${checks.length}/${checks.length} checks passed`);
