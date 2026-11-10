import type {
  OpenMeteoAirQualityResponse,
} from "./openmeteo.types.js";
import {
  RateLimiter,
  requestWithRetry,
} from "../../rate-limiter/request-with-retry.js";

const OPEN_METEO_BASE_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MIN_REQUEST_INTERVAL_MS = 250;

export class OpenMeteoClient {
  private readonly rateLimiter = new RateLimiter(
    MIN_REQUEST_INTERVAL_MS,
  );

  async getAirQuality(
    latitude: number,
    longitude: number,
    forecastDays = 3,
  ): Promise<OpenMeteoAirQualityResponse> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
      hourly:
        "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
      forecast_days: String(forecastDays),
      timezone: "UTC",
    });

    return requestWithRetry(
      (signal) =>
        fetch(
          `${OPEN_METEO_BASE_URL}?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal,
          },
        ),
      async (response) =>
        response.json() as Promise<OpenMeteoAirQualityResponse>,
      {
        maxAttempts: MAX_ATTEMPTS,
        baseDelayMs: BASE_RETRY_DELAY_MS,
        maxDelayMs: MAX_RETRY_DELAY_MS,
        timeoutMs: REQUEST_TIMEOUT_MS,
      },
      this.rateLimiter,
      "open-meteo",
    );
  }
}
