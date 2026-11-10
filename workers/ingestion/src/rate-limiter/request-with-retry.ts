export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export interface RetryableError extends Error {
  status?: number;
  retryAfterMs?: number;
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const parseRetryAfter = (
  value: string | null,
): number | undefined => {
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const retryAt = Date.parse(value);

  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return Math.max(0, retryAt - Date.now());
};

const isRetryableStatus = (status: number): boolean =>
  status === 429 || status >= 500;

const calculateBackoff = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number => {
  const exponentialDelay = Math.min(
    maxDelayMs,
    baseDelayMs * 2 ** (attempt - 1),
  );

  const jitter = Math.random() * exponentialDelay * 0.25;

  return Math.round(exponentialDelay + jitter);
};

export class RateLimiter {
  private nextAvailableAt = 0;

  constructor(private readonly minIntervalMs: number) {
    if (minIntervalMs < 0) {
      throw new Error("minIntervalMs must be >= 0");
    }
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const delay = Math.max(0, this.nextAvailableAt - now);

    if (delay > 0) {
      await sleep(delay);
    }

    this.nextAvailableAt = Date.now() + this.minIntervalMs;
  }
}

export const requestWithRetry = async <T>(
  request: (signal: AbortSignal) => Promise<Response>,
  parseResponse: (response: Response) => Promise<T>,
  options: RetryOptions,
  rateLimiter: RateLimiter,
  providerName = "external-api",
): Promise<T> => {
  let lastError: Error | undefined;

  for (
    let attempt = 1;
    attempt <= options.maxAttempts;
    attempt += 1
  ) {
    await rateLimiter.wait();

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs);

    try {
      const response = await request(controller.signal);

      if (response.ok) {
        return await parseResponse(response);
      }

      const body = await response.text();

      const error: RetryableError = new Error(
        `${providerName} request failed: `
          + `${response.status} ${response.statusText} - ${body}`,
      );

      error.status = response.status;
      error.retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after"),
      );

      lastError = error;

      if (
        !isRetryableStatus(response.status)
        || attempt === options.maxAttempts
      ) {
        throw error;
      }

      const delay =
        error.retryAfterMs
        ?? calculateBackoff(
          attempt,
          options.baseDelayMs,
          options.maxDelayMs,
        );

      console.warn(
        `[${providerName}] request failed with ${response.status}; `
          + `retrying in ${delay}ms `
          + `(attempt ${attempt}/${options.maxAttempts})`,
      );

      await sleep(delay);
    } catch (error) {
      if (
        error instanceof Error
        && "status" in error
        && typeof (error as RetryableError).status === "number"
      ) {
        throw error;
      }

      const normalizedError =
        error instanceof Error
          ? error
          : new Error(String(error));

      lastError = normalizedError;

      if (attempt === options.maxAttempts) {
        throw normalizedError;
      }

      const delay = calculateBackoff(
        attempt,
        options.baseDelayMs,
        options.maxDelayMs,
      );

      console.warn(
        `[${providerName}] request error; `
          + `retrying in ${delay}ms `
          + `(attempt ${attempt}/${options.maxAttempts})`,
      );

      await sleep(delay);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error(`${providerName} request failed`);
};
