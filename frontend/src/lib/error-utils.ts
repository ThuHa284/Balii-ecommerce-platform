const TECHNICAL_ERROR_PATTERNS = [
  /exception/i,
  /stack/i,
  /sql/i,
  /typeorm/i,
  /axios/i,
  /network error/i,
  /ecconn/i,
  /timeout/i,
  /undefined/i,
  /null/i,
  /failed/i,
  /internal server error/i,
  /upstream/i,
  /jwt/i,
  /token/i,
  /trace/i,
  /cannot /i,
  /http/i,
];

export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message?.trim();
  if (!message) {
    return fallback;
  }

  if (message.length > 180) {
    return fallback;
  }

  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message;
}
