export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatusCodes?: number[];
  operationName?: string;
  onRetry?: (details: RetryDetails) => void;
};

export type RetryDetails = {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  operationName: string;
  error: unknown;
};

const DEFAULT_RETRYABLE_STATUS_CODES = [
  408,
  409,
  429,
  500,
  502,
  503,
  504,
];

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

function getRetryAfterMs(error: unknown): number | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("headers" in error)
  ) {
    return undefined;
  }

  const headers = error.headers;

  if (
    typeof headers !== "object" ||
    headers === null ||
    !("get" in headers) ||
    typeof headers.get !== "function"
  ) {
    return undefined;
  }

  const retryAfter = headers.get("retry-after");

  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const retryDate = Date.parse(retryAfter);

  if (Number.isNaN(retryDate)) {
    return undefined;
  }

  return Math.max(retryDate - Date.now(), 0);
}

function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay =
    baseDelayMs * Math.pow(2, attempt - 1);

  const jitter = Math.floor(
    Math.random() * Math.max(baseDelayMs / 2, 1),
  );

  return Math.min(
    exponentialDelay + jitter,
    maxDelayMs,
  );
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 5,
    baseDelayMs = 15_000,
    maxDelayMs = 60_000,
    retryableStatusCodes =
      DEFAULT_RETRYABLE_STATUS_CODES,
    operationName = "operation",
    onRetry,
  } = options;

  if (maxAttempts < 1) {
    throw new Error(
      "RetryManager requires at least one attempt.",
    );
  }

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const status = getErrorStatus(error);
      const isRetryable =
        status !== undefined &&
        retryableStatusCodes.includes(status);

      const hasAttemptsRemaining =
        attempt < maxAttempts;

      if (!isRetryable || !hasAttemptsRemaining) {
        throw error;
      }

      const retryAfterMs =
        getRetryAfterMs(error);

      const delayMs =
        retryAfterMs ??
        calculateDelay(
          attempt,
          baseDelayMs,
          maxDelayMs,
        );

      const details: RetryDetails = {
        attempt,
        maxAttempts,
        delayMs,
        operationName,
        error,
      };

      console.warn(
        `${operationName} was temporarily blocked. Retrying in ${Math.ceil(
          delayMs / 1000,
        )} seconds. Attempt ${attempt + 1} of ${maxAttempts}.`,
      );

      onRetry?.(details);

      await wait(delayMs);
    }
  }

  throw lastError;
}