import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeOpenMeteoForecast,
} from "./openmeteo.normalizer.js";

const generatedAt = new Date(
  "2026-11-10T05:30:00.000Z",
);

const createResponse = () => ({
  latitude: 28.6,
  longitude: 77.2,
  timezone: "GMT",
  hourly: {
    time: [
      "2026-11-10T04:00",
      "2026-11-10T05:00",
      "2026-11-10T06:00",
      "2026-11-10T07:00",
    ],
    pm10: [100, 110, 120, 130],
    pm2_5: [50, 55, 60, 65],
    carbon_monoxide: [1000, 1100, 1200, 1300],
    nitrogen_dioxide: [20, 21, 22, 23],
    sulphur_dioxide: [10, 11, 12, 13],
    ozone: [80, 81, 82, 83],
  },
});

describe("normalizeOpenMeteoForecast", () => {
  it("normalizes only future hourly forecasts", () => {
    const result = normalizeOpenMeteoForecast(
      createResponse(),
      "open-meteo:28.6:77.2",
      generatedAt,
    );

    expect(result).toHaveLength(12);

    expect(result[0]).toMatchObject({
      locationSourceId: "open-meteo:28.6:77.2",
      generatedAt,
      forecastFor: new Date(
        "2026-11-10T06:00:00.000Z",
      ),
      pollutant: "PM2.5",
      predictedValue: 60,
      unit: "µg/m³",
      source: "OPEN_METEO",
      modelVersion: null,
      predictionLower: null,
      predictionUpper: null,
    });
  });

  it("interprets Open-Meteo timestamps as UTC", () => {
    const result = normalizeOpenMeteoForecast(
      createResponse(),
      "open-meteo:28.6:77.2",
      generatedAt,
    );

    expect(result[0]?.forecastFor.toISOString()).toBe(
      "2026-11-10T06:00:00.000Z",
    );
  });

  it("creates forecasts for all supported pollutants", () => {
    const result = normalizeOpenMeteoForecast(
      createResponse(),
      "open-meteo:28.6:77.2",
      generatedAt,
    );

    const pollutants = result
      .filter(
        (forecast) =>
          forecast.forecastFor.toISOString() ===
          "2026-11-10T06:00:00.000Z",
      )
      .map((forecast) => forecast.pollutant);

    expect(pollutants).toEqual([
      "PM2.5",
      "PM10",
      "NO2",
      "O3",
      "SO2",
      "CO",
    ]);
  });

  it("skips missing forecast values", () => {
    const response = createResponse();

    response.hourly.pm2_5[2] = null as never;

    const result = normalizeOpenMeteoForecast(
      response,
      "open-meteo:28.6:77.2",
      generatedAt,
    );

    const pm25 = result.filter(
      (forecast) => forecast.pollutant === "PM2.5",
    );

    expect(pm25).toHaveLength(1);
    expect(pm25[0]?.forecastFor.toISOString()).toBe(
      "2026-11-10T07:00:00.000Z",
    );
  });

  it("returns an empty array when hourly data is missing", () => {
    const response = {
      latitude: 28.6,
      longitude: 77.2,
      timezone: "GMT",
    };
  
    const result = normalizeOpenMeteoForecast(
      response,
      "open-meteo:28.6:77.2",
      generatedAt,
    );
  
    expect(result).toEqual([]);
  });
});