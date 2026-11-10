import { describe, expect, it } from "vitest";
import { IDWService } from "../idw/idw.service.js";
import { HeatmapService } from "./heatmap.service.js";

const service = new HeatmapService(new IDWService());

const stations = [
  {
    id: "station-1",
    latitude: 28.6,
    longitude: 77.1,
    value: 100,
    pollutant: "PM2.5",
    unit: "µg/m³",
  },
  {
    id: "station-2",
    latitude: 28.7,
    longitude: 77.2,
    value: 50,
    pollutant: "PM2.5",
    unit: "µg/m³",
  },
];

const bounds = {
  minLatitude: 28.5,
  maxLatitude: 28.8,
  minLongitude: 77.0,
  maxLongitude: 77.3,
};

describe("HeatmapService", () => {
  it("generates the requested grid", () => {
    const result = service.generate({
      pollutant: "PM2.5",
      unit: "µg/m³",
      stations,
      bounds,
      options: {
        rows: 3,
        columns: 4,
      },
    });

    expect(result.rows).toBe(3);
    expect(result.columns).toBe(4);
    expect(result.cells).toHaveLength(12);
  });

  it("produces finite interpolated values where coverage exists", () => {
    const result = service.generate({
      pollutant: "PM2.5",
      unit: "µg/m³",
      stations,
      bounds,
      options: {
        rows: 3,
        columns: 3,
        maxDistanceKm: 100,
      },
    });

    const validCells = result.cells.filter(
      (cell) => cell.value !== null,
    );

    expect(validCells.length).toBeGreaterThan(0);

    for (const cell of validCells) {
      expect(Number.isFinite(cell.value)).toBe(true);
      expect(cell.stationsUsed).toBeGreaterThan(0);
    }
  });

  it("creates no-data cells when interpolation coverage is unavailable", () => {
    const result = service.generate({
      pollutant: "PM2.5",
      unit: "µg/m³",
      stations,
      bounds: {
        minLatitude: 20,
        maxLatitude: 20.1,
        minLongitude: 70,
        maxLongitude: 70.1,
      },
      options: {
        rows: 3,
        columns: 3,
        maxDistanceKm: 1,
      },
    });

    expect(
      result.cells.every((cell) => cell.value === null),
    ).toBe(true);
  });

  it("filters stations by pollutant and unit", () => {
    const result = service.generate({
      pollutant: "PM10",
      unit: "µg/m³",
      stations: [
        ...stations,
        {
          id: "pm10-station",
          latitude: 28.65,
          longitude: 77.15,
          value: 75,
          pollutant: "PM10",
          unit: "µg/m³",
        },
      ],
      bounds,
      options: {
        rows: 2,
        columns: 2,
        maxDistanceKm: 100,
      },
    });

    expect(
      result.cells.some((cell) => cell.value !== null),
    ).toBe(true);
  });

  it("rejects invalid grid dimensions", () => {
    expect(() =>
      service.generate({
        pollutant: "PM2.5",
        unit: "µg/m³",
        stations,
        bounds,
        options: {
          rows: 1,
          columns: 3,
        },
      }),
    ).toThrow("Heatmap rows");
  });

  it("rejects invalid geographic bounds", () => {
    expect(() =>
      service.generate({
        pollutant: "PM2.5",
        unit: "µg/m³",
        stations,
        bounds: {
          minLatitude: 30,
          maxLatitude: 20,
          minLongitude: 77,
          maxLongitude: 78,
        },
        options: {
          rows: 3,
          columns: 3,
        },
      }),
    ).toThrow("Invalid heatmap latitude bounds");
  });

  it("rejects when requested pollutant is unavailable", () => {
    expect(() =>
      service.generate({
        pollutant: "O3",
        unit: "µg/m³",
        stations,
        bounds,
        options: {
          rows: 3,
          columns: 3,
        },
      }),
    ).toThrow("No stations available");
  });
});