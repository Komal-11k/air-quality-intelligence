type OpenMeteoCurrentResponse = {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    pm2_5?: number;
    pm10?: number;
    carbon_monoxide?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
  };
  current_units: {
    pm2_5?: string;
    pm10?: string;
    carbon_monoxide?: string;
    nitrogen_dioxide?: string;
    sulphur_dioxide?: string;
    ozone?: string;
  };
};

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    carbon_monoxide?: Array<number | null>;
    nitrogen_dioxide?: Array<number | null>;
    sulphur_dioxide?: Array<number | null>;
    ozone?: Array<number | null>;
  };
  hourly_units: {
    pm2_5?: string;
    pm10?: string;
    carbon_monoxide?: string;
    nitrogen_dioxide?: string;
    sulphur_dioxide?: string;
    ozone?: string;
  };
}

const OPEN_METEO_BASE_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MIN_REQUEST_INTERVAL_MS = 250;

let lastRequestAt = 0;

const sleep = async (
  milliseconds: number,
): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const waitForRateLimit = async (): Promise<void> => {
  const elapsed = Date.now() - lastRequestAt;

  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(
      MIN_REQUEST_INTERVAL_MS - elapsed,
    );
  }

  lastRequestAt = Date.now();
};

const getRetryDelay = (
  attempt: number,
  retryAfterHeader: string | null,
): number => {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number(
      retryAfterHeader,
    );

    if (
      Number.isFinite(retryAfterSeconds) &&
      retryAfterSeconds >= 0
    ) {
      return Math.min(
        retryAfterSeconds * 1_000,
        MAX_RETRY_DELAY_MS,
      );
    }
  }

  return Math.min(
    BASE_RETRY_DELAY_MS * 2 ** (attempt - 1),
    MAX_RETRY_DELAY_MS,
  );
};

export const getCurrentAirQualityByCoordinates =
  async (
    latitude: number,
    longitude: number,
  ): Promise<OpenMeteoCurrentResponse> => {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
      timezone: "auto",
    });

    const response = await fetch(
      `${OPEN_METEO_BASE_URL}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Open-Meteo request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<OpenMeteoCurrentResponse>;
  };

export const getForecastByCoordinates =
  async (
    latitude: number,
    longitude: number,
    hours: number,
  ): Promise<OpenMeteoForecastResponse> => {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly:
        "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
      forecast_hours: String(hours),
      timezone: "UTC",
    });

    const url =
      `${OPEN_METEO_BASE_URL}?${params.toString()}`;

    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt += 1
    ) {
      let response: Response | undefined;

      try {
        await waitForRateLimit();

        const controller =
          new AbortController();

        const timeout = setTimeout(() => {
          controller.abort();
        }, REQUEST_TIMEOUT_MS);

        try {
          response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.ok) {
          return (await response.json()) as OpenMeteoForecastResponse;
        }

        const retryable =
          response.status === 429 ||
          response.status >= 500;

        if (!retryable) {
          throw new Error(
            `Open-Meteo forecast request failed: ${response.status} ${response.statusText}`,
          );
        }

        lastError = new Error(
          `Open-Meteo forecast request failed: ${response.status} ${response.statusText}`,
        );

        if (attempt < MAX_ATTEMPTS) {
          await sleep(
            getRetryDelay(
              attempt,
              response.headers.get(
                "retry-after",
              ),
            ),
          );
        }
      } catch (error) {
        lastError = error;

        if (attempt < MAX_ATTEMPTS) {
          await sleep(
            getRetryDelay(attempt, null),
          );
        }
      }
    }

    throw new Error(
      `Open-Meteo forecast request failed after ${MAX_ATTEMPTS} attempts`,
      {
        cause: lastError,
      },
    );
  };