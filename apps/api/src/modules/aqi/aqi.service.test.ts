import { describe, expect, it } from "vitest";
import { calculateAqi } from "./aqi.service.js";

describe("calculateAqi", () => {
  it("calculates AQI from PM2.5", () => {
    const result = calculateAqi({
      pm25: 25,
    });

    expect(result.aqi).toBe(42);
    expect(result.category).toBe("Good");
    expect(result.dominantPollutant).toBe("pm25");
  });
  it("calculates a higher AQI when PM2.5 is higher", () => {
    const result = calculateAqi({
      pm25: 75,
    });
  
    expect(result.aqi).toBe(151);
    expect(result.category).toBe("Moderate");
    expect(result.dominantPollutant).toBe("pm25");
  });
  
  it("uses the highest pollutant sub-index as the overall AQI", () => {
    const result = calculateAqi({
      pm25: 25,
      pm10: 200,
    });
  
    expect(result.dominantPollutant).toBe("pm10");
    expect(result.aqi).toBe(167);
    expect(result.category).toBe("Moderate");
  });
  
  it("rejects an empty pollutant input", () => {
    expect(() => calculateAqi({})).toThrow(
      "At least one pollutant concentration is required",
    );
  });
});