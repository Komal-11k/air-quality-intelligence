import { describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/database/client.js", () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock("../aqi/aqi-current.service.js", () => ({
  calculateCurrentAqi: vi.fn(),
}));

import { db } from "../../infrastructure/database/client.js";
import { calculateCurrentAqi } from "../aqi/aqi-current.service.js";
import { evaluateAlerts } from "./alerts.service.js";

describe("evaluateAlerts", () => {
  it("triggers an AQI threshold alert", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "alert-1",
            locationId: "location-1",
            type: "AQI_THRESHOLD",
            pollutant: null,
            condition: "GREATER_THAN",
            threshold: 150,
            enabled: true,
            isTriggered: false,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [],
      } as never)
      .mockResolvedValueOnce({
        rows: [],
      } as never)
      .mockResolvedValueOnce({
        rows: [],
      } as never);

    vi.mocked(calculateCurrentAqi).mockResolvedValue({
      locationId: "location-1",
      aqi: 183,
      category: "Moderate",
      dominantPollutant: "pm25",
      measurements: [],
    });

    const result = await evaluateAlerts("location-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "alert-1",
      type: "AQI_THRESHOLD",
      currentValue: 183,
    });

    expect(db.query).toHaveBeenCalled();
  });
});

it("does not create a duplicate event when the alert is already triggered", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "alert-1",
            locationId: "location-1",
            type: "AQI_THRESHOLD",
            pollutant: null,
            condition: "GREATER_THAN",
            threshold: 150,
            enabled: true,
            isTriggered: true,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [],
      } as never);

    vi.mocked(calculateCurrentAqi).mockResolvedValue({
      locationId: "location-1",
      aqi: 183,
      category: "Moderate",
      dominantPollutant: "pm25",
      measurements: [],
    });

    const result = await evaluateAlerts("location-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "alert-1",
      currentValue: 183,
    });

    const insertCalls = vi
      .mocked(db.query)
      .mock.calls
      .filter(([query]) =>
        String(query).includes("INSERT INTO alert_events"),
      );

    expect(insertCalls).toHaveLength(0);
  });

  it("clears the triggered state when the alert condition is no longer met", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "alert-1",
            locationId: "location-1",
            type: "AQI_THRESHOLD",
            pollutant: null,
            condition: "GREATER_THAN",
            threshold: 150,
            enabled: true,
            isTriggered: true,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [],
      } as never)
      .mockResolvedValueOnce({
        rows: [],
      } as never);

    vi.mocked(calculateCurrentAqi).mockResolvedValue({
      locationId: "location-1",
      aqi: 120,
      category: "Moderate",
      dominantPollutant: "pm25",
      measurements: [],
    });

    const result = await evaluateAlerts("location-1");

    expect(result).toHaveLength(0);

    const updateCalls = vi
  .mocked(db.query)
  .mock.calls
  .filter(([query]) =>
    String(query).includes("SET is_triggered = FALSE"),
  );

expect(updateCalls).toHaveLength(1);
  });
