import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
  ForecastRepository,
  type PersistForecastInput,
} from "./forecast.repository.js";

const createForecast = (
  overrides: Partial<PersistForecastInput> = {},
): PersistForecastInput => ({
  locationId: "316dea58-4c5e-4c19-8f83-c191a11668a2",
  locationSourceId: "5613",
  generatedAt: new Date("2026-11-10T06:20:11.499Z"),
  forecastFor: new Date("2026-11-10T07:00:00.000Z"),
  pollutant: "PM2.5",
  predictedValue: 97.6,
  unit: "µg/m³",
  source: "OPEN_METEO",
  modelVersion: null,
  predictionLower: null,
  predictionUpper: null,
  rawData: {
    time: "2026-11-10T07:00",
    pollutant: "pm2_5",
    value: 97.6,
  },
  ...overrides,
});

describe("ForecastRepository", () => {
  it("inserts a forecast", async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
    });

    const db = {
      query,
    } as unknown as Pool;

    const repository = new ForecastRepository(db);

    await repository.insertForecast(createForecast());

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain(
      "INSERT INTO forecasts",
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      "ON CONFLICT",
    );
  });

  it("ignores an exact duplicate forecast", async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 0,
    });

    const db = {
      query,
    } as unknown as Pool;

    const repository = new ForecastRepository(db);

    await repository.insertForecast(createForecast());

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.results[0]?.value).toBeDefined();
  });

  it("returns zero for an empty batch", async () => {
    const query = vi.fn();

    const db = {
      query,
      connect: vi.fn(),
    } as unknown as Pool;

    const repository = new ForecastRepository(db);

    const inserted =
      await repository.insertForecasts([]);

    expect(inserted).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("inserts a batch transactionally", async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
    });

    const client = {
      query,
      release: vi.fn(),
    };

    const db = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;

    const repository = new ForecastRepository(db);

    const forecasts = [
      createForecast({
        pollutant: "PM2.5",
      }),
      createForecast({
        pollutant: "PM10",
      }),
      createForecast({
        pollutant: "NO2",
      }),
    ];

    const inserted =
      await repository.insertForecasts(forecasts);

    expect(inserted).toBe(3);
    expect(query.mock.calls[0]?.[0]).toBe("BEGIN");
    expect(query.mock.calls[1]?.[0]).toContain(
      "INSERT INTO forecasts",
    );
    expect(query.mock.calls[2]?.[0]).toContain(
      "INSERT INTO forecasts",
    );
    expect(query.mock.calls[3]?.[0]).toContain(
      "INSERT INTO forecasts",
    );
    expect(query.mock.calls[4]?.[0]).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});