import { ProductSearchResult } from '../interfaces/product-search-result.interface';
import { normalizeProductLink } from './normalize-serpapi-result';

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function deduplicateResults(
  results: ProductSearchResult[],
): ProductSearchResult[] {
  const byCompositeKey = new Map<string, ProductSearchResult>();

  for (const result of results) {
    const normalizedLink = normalizeProductLink(result.link);
    const normalizedTitle = normalizeTitle(result.title);
    const compositeKey = `${normalizedLink ?? ''}|${normalizedTitle}`;
    const existing = byCompositeKey.get(compositeKey);

    if (!existing || result.confidenceScore > existing.confidenceScore) {
      byCompositeKey.set(compositeKey, {
        ...result,
        link: normalizedLink ?? result.link,
      });
    }
  }

  return [...byCompositeKey.values()];
}
