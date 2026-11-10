import { describe, expect, it } from "vitest";
import { IDWService } from "./idw.service.js";
import type { SpatialStation } from "./idw.types.js";

const stations: SpatialStation[] = [
  {
    id: "station-1",
    latitude: 28.6139,
    longitude: 77.209,
    value: 100,
    pollutant: "PM2.5",
    unit: "µg/m³",
  },
  {
    id: "station-2",
    latitude: 28.7041,
    longitude: 77.1025,
    value: 50,
    pollutant: "PM2.5",
    unit: "µg/m³",
  },
];

describe("IDWService", () => {
  const service = new IDWService();

  it("returns the exact station value when target matches a station", () => {
    const result = service.interpolate(
      28.6139,
      77.209,
      stations,
    );

    expect(result.value).toBe(100);
    expect(result.stationsUsed).toBe(1);
    expect(result.nearestDistanceKm).toBe(0);
  });

  it("interpolates values using inverse distance weighting", () => {
    const result = service.interpolate(
      28.65,
      77.15,
      stations,
    );

    expect(result.value).toBeGreaterThan(50);
    expect(result.value).toBeLessThan(100);
    expect(result.stationsUsed).toBe(2);
    expect(result.nearestDistanceKm).toBeGreaterThan(0);
  });

  it("ignores stations with invalid values", () => {
    const result = service.interpolate(
      28.65,
      77.15,
      [
        ...stations,
        {
          id: "invalid",
          latitude: 28.7,
          longitude: 77.2,
          value: Number.NaN,
          pollutant: "PM2.5",
          unit: "µg/m³",
        },
      ],
    );

    expect(result.stationsUsed).toBe(2);
    expect(Number.isFinite(result.value)).toBe(true);
  });

  it("rejects when insufficient stations are available", () => {
    expect(() =>
      service.interpolate(
        28.65,
        77.15,
        stations,
        {
          maxDistanceKm: 1,
          minStations: 2,
        },
      ),
    ).toThrow("Insufficient stations");
  });

  it("rejects invalid target coordinates", () => {
    expect(() =>
      service.interpolate(
        100,
        77.15,
        stations,
      ),
    ).toThrow("Invalid target latitude");
  });

  it("rejects invalid IDW power", () => {
    expect(() =>
      service.interpolate(
        28.65,
        77.15,
        stations,
        {
          power: 0,
        },
      ),
    ).toThrow("IDW power must be greater than 0");
  });

  it("fails when no stations are supplied", () => {
    expect(() =>
      service.interpolate(
        28.65,
        77.15,
        [],
      ),
    ).toThrow("At least one station is required");
  });
});