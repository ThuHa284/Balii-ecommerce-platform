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
          sku: 'BL-DO-M',
          quantity: 2,
          lineTotal: 459000,
        },
      ],
    });

    expect(message).toContain('🛍️ BALII — ĐƠN HÀNG MỚI');
    expect(message).toContain('Mã đơn: #ORD-2026-001');
    expect(message).toContain('Bộ ngủ lụa Balii');
    expect(message).toContain('Biến thể: Đỏ / M • SKU: BL-DO-M');
    expect(message).toContain('SL: 2 • Thành tiền: 459.000 ₫');
    expect(message).toContain('Thanh toán: COD');
    expect(message).toContain('Tổng cộng: 459.000 ₫');
    expect(message).toContain('https://balii.ntthuha.id.vn/admin/orders');
  });

  it('shows VNPay and a readable fallback for variants without a label', () => {
    const message = buildZaloNewOrderMessage({
      orderNumber: 'ORD-VNPAY',
      customerName: 'Nguyễn Văn B',
      customerPhone: '0900000000',
      shippingAddress: 'Bình Đại, Vĩnh Long',
      paymentMethod: 'vnpay',
      totalAmount: 199000,
      adminUrl: 'https://balii.ntthuha.id.vn/admin/orders',
      items: [
        {
          productName: 'Áo Balii',
          variantLabel: '',
          sku: 'AO-001',
          quantity: 1,
          lineTotal: 199000,
        },
      ],
    });

    expect(message).toContain('Thanh toán: VNPay');
    expect(message).toContain('Biến thể: Mặc định • SKU: AO-001');
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
