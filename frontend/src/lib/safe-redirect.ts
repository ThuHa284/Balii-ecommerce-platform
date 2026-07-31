const INTERNAL_URL_BASE = 'https://balii.local';

export function getSafeInternalRedirect(
  candidate: string | null | undefined,
  fallback = '/',
): string {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_URL_BASE);
    if (parsed.origin !== INTERNAL_URL_BASE) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
