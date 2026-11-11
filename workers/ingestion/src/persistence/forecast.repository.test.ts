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
    expect(query.mock.calls[0]?.[0]).toContain(
      "forecast_for",
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      "DO UPDATE SET",
    );
  });

  it("updates an existing forecast when the generation time changes", async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
    });

    const db = {
      query,
    } as unknown as Pool;

    const repository = new ForecastRepository(db);

    await repository.insertForecast(
      createForecast({
        generatedAt: new Date(
          "2026-11-10T06:25:11.499Z",
        ),
      }),
    );

    expect(query).toHaveBeenCalledTimes(1);

    const sql = query.mock.calls[0]?.[0] as string;

    expect(sql).toContain(
      "ON CONFLICT (",
    );
    expect(sql).toContain(
      "source",
    );
    expect(sql).toContain(
      "location_id",
    );
    expect(sql).toContain(
      "forecast_for",
    );
    expect(sql).toContain(
      "pollutant",
    );
    expect(sql).toContain(
      "generated_at = EXCLUDED.generated_at",
    );
  });

  it("returns zero for an empty batch", async () => {
    const query = vi.fn();
    const connect = vi.fn();

    const db = {
      query,
      connect,
    } as unknown as Pool;

    const repository = new ForecastRepository(db);

    const affected =
      await repository.insertForecasts([]);

    expect(affected).toBe(0);
    expect(query).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it("upserts a batch transactionally", async () => {
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

    const affected =
      await repository.insertForecasts(forecasts);

    expect(affected).toBe(3);

    expect(query.mock.calls[0]?.[0]).toBe(
      "BEGIN",
    );

    expect(query.mock.calls[1]?.[0]).toContain(
      "INSERT INTO forecasts",
    );

    expect(query.mock.calls[1]?.[0]).toContain(
      "DO UPDATE SET",
    );

    expect(query.mock.calls[2]?.[0]).toContain(
      "DO UPDATE SET",
    );

    expect(query.mock.calls[3]?.[0]).toContain(
      "DO UPDATE SET",
    );

    expect(query.mock.calls[4]?.[0]).toBe(
      "COMMIT",
    );

    expect(client.release).toHaveBeenCalledTimes(1);
  });
});