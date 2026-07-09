import { ProductSearchResult } from '../interfaces/product-search-result.interface';

type SupportedEngine = ProductSearchResult['engine'];

function getFxToVnd(): Record<string, number> {
  return {
    VND: 1,
    USD: Number(process.env.SERPAPI_FX_USD_TO_VND ?? '26000'),
    EUR: Number(process.env.SERPAPI_FX_EUR_TO_VND ?? '30000'),
    GBP: Number(process.env.SERPAPI_FX_GBP_TO_VND ?? '35000'),
  };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    const parts = cleaned.split(',');
    normalized =
      parts.length > 2
        ? cleaned.replace(/,/g, '')
        : parts[1]?.length === 3
          ? cleaned.replace(/,/g, '')
          : cleaned.replace(',', '.');
  } else if (!hasComma && hasDot) {
    const parts = cleaned.split('.');
    normalized =
      parts.length > 2
        ? cleaned.replace(/\./g, '')
        : parts[1]?.length === 3
          ? cleaned.replace(/\./g, '')
          : cleaned;
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectCurrency(priceText: string | null): string | null {
  if (!priceText) {
    return null;
  }

  const normalized = priceText.toUpperCase();
  if (normalized.includes('VND') || normalized.includes('Đ')) {
    return 'VND';
  }

  if (normalized.includes('USD') || normalized.includes('$')) {
    return 'USD';
  }

  if (normalized.includes('EUR') || normalized.includes('€')) {
    return 'EUR';
  }

  if (normalized.includes('GBP') || normalized.includes('£')) {
    return 'GBP';
  }

  return null;
}

function normalizePriceObject(value: unknown): {
  text: string | null;
  amount: number | null;
  currency: string | null;
} {
  if (!value || typeof value !== 'object') {
    return { text: null, amount: null, currency: null };
  }

  const source = value as Record<string, unknown>;
  const text = normalizeOptionalString(source.value);
  const amount =
    normalizeNumber(source.extracted_value) ??
    normalizeNumber(source.value) ??
    null;
  const currency =
    normalizeOptionalString(source.currency)
      ?.replace(/[^A-Z$€£đĐ]/gi, '')
      .toUpperCase() ?? detectCurrency(text);

  return {
    text,
    amount,
    currency:
      currency === '$'
        ? 'USD'
        : currency === '€'
          ? 'EUR'
          : currency === '£'
            ? 'GBP'
            : currency === 'Đ'
              ? 'VND'
              : currency,
  };
}

function convertAmountToVnd(
  amount: number | null,
  currency: string | null,
): number | null {
  if (amount == null) {
    return null;
  }

  const fx = getFxToVnd()[currency ?? ''];
  if (!fx) {
    return amount;
  }

  return Math.round(amount * fx);
}

function formatVnd(amount: number | null): string | null {
  if (amount == null) {
    return null;
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function baseResult(
  item: Record<string, unknown>,
  engine: SupportedEngine,
): ProductSearchResult | null {
  const title =
    normalizeOptionalString(item.title) ??
    normalizeOptionalString(item.snippet) ??
    normalizeOptionalString(item.source);

  const link =
    normalizeOptionalString(item.link) ??
    normalizeOptionalString(item.product_link);

  if (!title) {
    return null;
  }

  const priceObject = normalizePriceObject(item.price);
  const rawPriceText =
    priceObject.text ??
    normalizeOptionalString(item.price) ??
    normalizeOptionalString(item.old_price) ??
    null;
  const rawCurrency =
    priceObject.currency ?? detectCurrency(rawPriceText) ?? null;
  const rawAmount =
    priceObject.amount ??
    normalizeNumber(item.extracted_price) ??
    normalizeNumber(item.extracted_old_price) ??
    normalizeNumber(rawPriceText);
  const normalizedAmount = convertAmountToVnd(rawAmount, rawCurrency);
  const normalizedCurrency = normalizedAmount != null ? 'VND' : rawCurrency;
  const normalizedPriceText =
    normalizedAmount != null && normalizedCurrency === 'VND'
      ? formatVnd(normalizedAmount)
      : rawPriceText;

  return {
    title,
    source: normalizeOptionalString(item.source),
    link,
    imageUrl:
      normalizeOptionalString(item.image) ??
      normalizeOptionalString(item.thumbnail) ??
      normalizeOptionalString(item.original),
    price: normalizedPriceText,
    extractedPrice: normalizedAmount,
    currency: normalizedCurrency,
    rating: normalizeNumber(item.rating),
    reviews: normalizeNumber(item.reviews),
    snippet: normalizeOptionalString(item.snippet),
    engine,
    confidenceScore: 0,
    rawData: item,
  };
}

export function normalizeLensResult(
  item: Record<string, unknown>,
): ProductSearchResult | null {
  const base = baseResult(item, 'google_lens');
  if (!base) {
    return null;
  }

  return {
    ...base,
    imageUrl:
      normalizeOptionalString(item.image) ??
      normalizeOptionalString(item.thumbnail) ??
      base.imageUrl,
    confidenceScore:
      normalizeNumber(item.position) != null
        ? Math.max(0.55, 1 - (Number(item.position) - 1) * 0.06)
        : 0.65,
  };
}

export function normalizeShoppingResult(
  item: Record<string, unknown>,
): ProductSearchResult | null {
  const base = baseResult(item, 'google_shopping');
  if (!base) {
    return null;
  }

  return {
    ...base,
    link:
      normalizeOptionalString(item.product_link) ??
      normalizeOptionalString(item.link) ??
      null,
    confidenceScore:
      normalizeNumber(item.position) != null
        ? Math.max(0.65, 1 - (Number(item.position) - 1) * 0.04)
        : 0.82,
  };
}

export function normalizeImagesResult(
  item: Record<string, unknown>,
): ProductSearchResult | null {
  const base = baseResult(item, 'google_images');
  if (!base) {
    return null;
  }

  return {
    ...base,
    link: normalizeOptionalString(item.link) ?? null,
    imageUrl:
      normalizeOptionalString(item.original) ??
      normalizeOptionalString(item.thumbnail) ??
      base.imageUrl,
    confidenceScore:
      normalizeNumber(item.position) != null
        ? Math.max(0.35, 0.75 - (Number(item.position) - 1) * 0.04)
        : 0.5,
  };
}

export function normalizeProductLink(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = '';
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}
