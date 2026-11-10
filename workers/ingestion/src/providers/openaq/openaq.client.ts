import type {
  OpenAQLatestResponse,
  OpenAQLocation,
  OpenAQMeasurementsResponse,
  OpenAQSensorResponse,
} from "./openaq.types.js";
import {
  RateLimiter,
  requestWithRetry,
} from "../../rate-limiter/request-with-retry.js";

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";

const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MIN_REQUEST_INTERVAL_MS = 250;

export class OpenAQClient {
  private readonly apiKey: string;

  private readonly rateLimiter = new RateLimiter(
    MIN_REQUEST_INTERVAL_MS,
  );

  constructor(apiKey: string) {
    if (!apiKey.trim()) {
      throw new Error("OPENAQ_API_KEY is required");
    }

    this.apiKey = apiKey;
  }

  private async request<T>(path: string): Promise<T> {
    return requestWithRetry(
      (signal) =>
        fetch(`${OPENAQ_BASE_URL}${path}`, {
          method: "GET",
          headers: {
            "X-API-Key": this.apiKey,
            Accept: "application/json",
          },
          signal,
        }),
      async (response) => response.json() as Promise<T>,
      {
        maxAttempts: MAX_ATTEMPTS,
        baseDelayMs: BASE_RETRY_DELAY_MS,
        maxDelayMs: MAX_RETRY_DELAY_MS,
        timeoutMs: REQUEST_TIMEOUT_MS,
      },
      this.rateLimiter,
    );
  }

  async getLocation(locationId: number): Promise<OpenAQLocation> {
    const response = await this.request<{ results: OpenAQLocation[] }>(
      `/locations/${locationId}`,
    );

    const location = response.results[0];

    if (!location) {
      throw new Error(`OpenAQ location ${locationId} was not found`);
    }

    return location;
  }

  async getSensors(
    locationId: number,
    limit = 100,
  ): Promise<OpenAQSensorResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
      page: "1",
    });

    return this.request<OpenAQSensorResponse>(
      `/locations/${locationId}/sensors?${params.toString()}`,
    );
  }

  async getSensorMeasurements(
    sensorId: number,
    datetimeFrom: string,
    datetimeTo: string,
    limit = 100,
  ): Promise<OpenAQMeasurementsResponse> {
    const params = new URLSearchParams({
      datetime_from: datetimeFrom,
      datetime_to: datetimeTo,
      limit: String(limit),
      page: "1",
    });

    return this.request<OpenAQMeasurementsResponse>(
      `/sensors/${sensorId}/measurements?${params.toString()}`,
    );
  }

  async getLatestMeasurements(
    locationId: number,
  ): Promise<OpenAQLatestResponse> {
    return this.request<OpenAQLatestResponse>(
      `/locations/${locationId}/latest?limit=100&page=1`,
    );
  }
}
