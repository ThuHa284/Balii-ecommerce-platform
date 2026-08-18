import { buildZaloNewOrderMessage } from './zalo-notification.service';

describe('buildZaloNewOrderMessage', () => {
  it('formats the order summary and admin link for Zalo', () => {
    const message = buildZaloNewOrderMessage({
      orderNumber: 'ORD-2026-001',
      customerName: 'Nguyễn Văn A',
      customerPhone: '0901234567',
      shippingAddress: 'Ấp 4 Cây Trôm, Xã Bình Đại, Tỉnh Vĩnh Long',
      paymentMethod: 'cod',
      totalAmount: 459000,
      adminUrl: 'https://balii.ntthuha.id.vn/admin/orders',
      items: [
        {
          productName: 'Bộ ngủ lụa Balii',
          variantLabel: 'Đỏ / M',
          quantity: 2,
          lineTotal: 459000,
        },
      ],
    });

    expect(message).toContain('🛍️ BALII — ĐƠN HÀNG MỚI');
    expect(message).toContain('Mã đơn: #ORD-2026-001');
    expect(message).toContain('Bộ ngủ lụa Balii (Đỏ / M) × 2');
    expect(message).toContain('Tổng cộng: 459.000 ₫');
    expect(message).toContain('https://balii.ntthuha.id.vn/admin/orders');
  });

  it('limits long messages to a safe Zalo payload size', () => {
    const message = buildZaloNewOrderMessage({
      orderNumber: 'ORD-LONG',
      customerName: 'Khách hàng',
      customerPhone: '',
      shippingAddress: 'A'.repeat(2500),
      paymentMethod: 'vnpay',
      totalAmount: 100000,
      adminUrl: 'https://balii.ntthuha.id.vn/admin/orders',
      items: [],
    });

    expect(message.length).toBeLessThanOrEqual(1900);
    expect(message.endsWith('…')).toBe(true);
  });
});
