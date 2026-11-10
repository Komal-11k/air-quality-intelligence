import { describe, expect, it, vi } from "vitest";
import { IngestionService } from "./ingestion.service.js";

describe("IngestionService", () => {
  const createDependencies = () => ({
    openAQClient: {
      getLocation: vi.fn(),
      getSensors: vi.fn(),
      getLatestMeasurements: vi.fn(),
    },

    openMeteoClient: {
      getAirQuality: vi.fn(),
    },

    locationRepository: {
      upsertLocation: vi.fn(),
    },

    measurementRepository: {
      insertMeasurements: vi.fn(),
    },

    forecastRepository: {
      insertForecasts: vi.fn(),
    },
  });

  const createLogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  const location = {
    id: 5613,
    name: "Test Station",
    locality: "Delhi",
    timezone: "Asia/Kolkata",
    country: {
      id: 101,
      code: "IN",
      name: "India",
    },
    coordinates: {
      latitude: 28.6139,
      longitude: 77.209,
    },
  };

  const sensor = {
    id: 1001,
    name: "PM2.5 sensor",
    parameter: {
      id: 2,
      name: "pm25",
      units: "µg/m³",
      displayName: "PM2.5",
    },
    datetimeFirst: null,
    datetimeLast: null,
    coverage: null,
    latest: null,
  };

  const latestMeasurement = {
    datetime: {
      utc: "2026-11-10T06:00:00Z",
      local: "2026-11-10T11:30:00+05:30",
    },
    value: 25,
    coordinates: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    sensorsId: 1001,
    locationsId: 5613,
  };

  const openMeteoResponse = {
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "UTC",

    current: {
      time: "2026-11-10T06:00",
      interval: 3600,
      pm10: 40,
      pm2_5: 25,
      carbon_monoxide: 300,
      nitrogen_dioxide: 20,
      sulphur_dioxide: 5,
      ozone: 80,
    },

    hourly: {
      time: [
        "2026-11-10T07:00",
        "2026-11-10T08:00",
      ],
      pm10: [42, 44],
      pm2_5: [27, 29],
      carbon_monoxide: [310, 320],
      nitrogen_dioxide: [21, 22],
      sulphur_dioxide: [6, 7],
      ozone: [82, 84],
    },
  };

  it("ingests OpenAQ and Open-Meteo data successfully", async () => {
    const dependencies = createDependencies();
    const logger = createLogger();

    dependencies.openAQClient.getLocation.mockResolvedValue(
      location,
    );

    dependencies.openAQClient.getSensors.mockResolvedValue({
      results: [sensor],
    });

    dependencies.openAQClient.getLatestMeasurements.mockResolvedValue({
      results: [latestMeasurement],
    });

    dependencies.openMeteoClient.getAirQuality.mockResolvedValue(
      openMeteoResponse,
    );

    dependencies.locationRepository.upsertLocation.mockResolvedValue({
      id: "location-1",
      source: "OPENAQ",
      sourceLocationId: "5613",
    });

    dependencies.measurementRepository.insertMeasurements.mockResolvedValue(
      7,
    );

    dependencies.forecastRepository.insertForecasts.mockResolvedValue(
      12,
    );

    const service = new IngestionService(
      dependencies,
      logger,
    );

    await service.ingestLocation(5613);

    expect(
      dependencies.openAQClient.getLocation,
    ).toHaveBeenCalledWith(5613);

    expect(
      dependencies.openAQClient.getSensors,
    ).toHaveBeenCalledWith(5613, 100);

    expect(
      dependencies.openAQClient.getLatestMeasurements,
    ).toHaveBeenCalledWith(5613);

    expect(
      dependencies.openMeteoClient.getAirQuality,
    ).toHaveBeenCalledWith(
      28.6139,
      77.209,
      3,
    );

    expect(
      dependencies.locationRepository.upsertLocation,
    ).toHaveBeenCalledOnce();

    expect(
        dependencies.measurementRepository.insertMeasurements,
      ).toHaveBeenCalledTimes(2);

    expect(
      dependencies.forecastRepository.insertForecasts,
    ).toHaveBeenCalledOnce();

    expect(
      logger.warn,
    ).not.toHaveBeenCalled();

    expect(
      logger.error,
    ).not.toHaveBeenCalled();
  });

  it("persists OpenAQ data when Open-Meteo fails", async () => {
    const dependencies = createDependencies();
    const logger = createLogger();

    dependencies.openAQClient.getLocation.mockResolvedValue(
      location,
    );

    dependencies.openAQClient.getSensors.mockResolvedValue({
      results: [sensor],
    });

    dependencies.openAQClient.getLatestMeasurements.mockResolvedValue({
      results: [latestMeasurement],
    });

    dependencies.locationRepository.upsertLocation.mockResolvedValue({
      id: "location-1",
      source: "OPENAQ",
      sourceLocationId: "5613",
    });

    dependencies.measurementRepository.insertMeasurements.mockResolvedValue(
      1,
    );

    dependencies.openMeteoClient.getAirQuality.mockRejectedValue(
      new Error("Open-Meteo unavailable"),
    );

    const service = new IngestionService(
      dependencies,
      logger,
    );

    await service.ingestLocation(5613);

    expect(
      dependencies.locationRepository.upsertLocation,
    ).toHaveBeenCalledOnce();

    expect(
      dependencies.measurementRepository.insertMeasurements,
    ).toHaveBeenCalledOnce();

    expect(
      dependencies.forecastRepository.insertForecasts,
    ).not.toHaveBeenCalled();

    expect(
      logger.warn,
    ).toHaveBeenCalledOnce();
  });

  it("rejects a location with missing coordinates", async () => {
    const dependencies = createDependencies();
    const logger = createLogger();

    dependencies.openAQClient.getLocation.mockResolvedValue({
      ...location,
      coordinates: {
        latitude: null,
        longitude: null,
      },
    });

    const service = new IngestionService(
      dependencies,
      logger,
    );

    await expect(
      service.ingestLocation(5613),
    ).rejects.toThrow(
      "OpenAQ location 5613 has missing coordinates",
    );

    expect(
      dependencies.openAQClient.getSensors,
    ).not.toHaveBeenCalled();

    expect(
      dependencies.locationRepository.upsertLocation,
    ).not.toHaveBeenCalled();
  });

  it("continues processing other locations when one location fails", async () => {
    const dependencies = createDependencies();
    const logger = createLogger();

    dependencies.openAQClient.getLocation
      .mockRejectedValueOnce(
        new Error("OpenAQ unavailable"),
      )
      .mockResolvedValueOnce(location);

    dependencies.openAQClient.getSensors.mockResolvedValue({
      results: [sensor],
    });

    dependencies.openAQClient.getLatestMeasurements.mockResolvedValue({
      results: [latestMeasurement],
    });

    dependencies.locationRepository.upsertLocation.mockResolvedValue({
      id: "location-1",
      source: "OPENAQ",
      sourceLocationId: "5613",
    });

    dependencies.measurementRepository.insertMeasurements.mockResolvedValue(
      1,
    );

    dependencies.openMeteoClient.getAirQuality.mockResolvedValue(
      openMeteoResponse,
    );

    dependencies.forecastRepository.insertForecasts.mockResolvedValue(
      1,
    );

    const service = new IngestionService(
      dependencies,
      logger,
    );

    await service.runCycle([5613, 5614]);

    expect(
      dependencies.openAQClient.getLocation,
    ).toHaveBeenCalledTimes(2);

    expect(
      dependencies.locationRepository.upsertLocation,
    ).toHaveBeenCalledOnce();

    expect(
      logger.error,
    ).toHaveBeenCalledOnce();

    expect(
      logger.info,
    ).toHaveBeenCalledWith(
      "[ingestion] cycle completed",
    );
  });
});