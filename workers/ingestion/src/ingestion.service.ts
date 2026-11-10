import { normalizeOpenAQLatestMeasurement } from "./normalization/openaq-latest.normalizer.js";
import { normalizeOpenMeteoCurrent } from "./normalization/openmeteo-current.normalizer.js";
import { normalizeOpenMeteoForecast } from "./normalization/openmeteo.normalizer.js";
import { validateMeasurement } from "./validation/validate-measurement.js";
import { validateForecast } from "./validation/validate-forecast.js";

import type { OpenAQLocation } from "./providers/openaq/openaq.types.js";
import type { OpenAQSensorResponse } from "./providers/openaq/openaq.types.js";
import type { OpenAQLatestResponse } from "./providers/openaq/openaq.types.js";
import type { OpenMeteoAirQualityResponse } from "./providers/openmeteo/openmeteo.types.js";
import type { UpsertLocationInput } from "./persistence/location.repository.js";
import type { LocationRecord } from "./persistence/location.repository.js";
import type { PersistMeasurementInput } from "./persistence/measurement.repository.js";
import type { PersistForecastInput } from "./persistence/forecast.repository.js";

export interface OpenAQClientPort {
  getLocation(locationId: number): Promise<OpenAQLocation>;

  getSensors(
    locationId: number,
    limit?: number,
  ): Promise<OpenAQSensorResponse>;

  getLatestMeasurements(
    locationId: number,
  ): Promise<OpenAQLatestResponse>;
}

export interface OpenMeteoClientPort {
  getAirQuality(
    latitude: number,
    longitude: number,
    forecastDays?: number,
  ): Promise<OpenMeteoAirQualityResponse>;
}

export interface LocationRepositoryPort {
  upsertLocation(
    input: UpsertLocationInput,
  ): Promise<LocationRecord>;
}

export interface MeasurementRepositoryPort {
  insertMeasurements(
    measurements: PersistMeasurementInput[],
  ): Promise<number>;
}

export interface ForecastRepositoryPort {
  insertForecasts(
    forecasts: PersistForecastInput[],
  ): Promise<number>;
}

export interface IngestionServiceDependencies {
  openAQClient: OpenAQClientPort;
  openMeteoClient: OpenMeteoClientPort;
  locationRepository: LocationRepositoryPort;
  measurementRepository: MeasurementRepositoryPort;
  forecastRepository: ForecastRepositoryPort;
}

export interface IngestionLogger {
  info(message: string): void;
  warn(message: string, error?: unknown): void;
  error(message: string, error?: unknown): void;
}

const defaultLogger: IngestionLogger = {
  info: (message) => console.log(message),
  warn: (message, error) => console.warn(message, error),
  error: (message, error) => console.error(message, error),
};

export class IngestionService {
  constructor(
    private readonly dependencies: IngestionServiceDependencies,
    private readonly logger: IngestionLogger = defaultLogger,
  ) {}

  async ingestLocation(
    locationSourceId: number,
  ): Promise<void> {
    const {
      openAQClient,
      openMeteoClient,
      locationRepository,
      measurementRepository,
      forecastRepository,
    } = this.dependencies;

    const generatedAt = new Date();

    const location =
      await openAQClient.getLocation(locationSourceId);

    const latitude = location.coordinates.latitude;
    const longitude = location.coordinates.longitude;

    if (latitude === null || longitude === null) {
      throw new Error(
        `OpenAQ location ${locationSourceId} has missing coordinates`,
      );
    }

    const sensorsResponse =
      await openAQClient.getSensors(
        locationSourceId,
        100,
      );

    const latestResponse =
      await openAQClient.getLatestMeasurements(
        locationSourceId,
      );

    const sensorsById = new Map(
      sensorsResponse.results.map(
        (sensor) => [sensor.id, sensor],
      ),
    );

    const persistedLocation =
      await locationRepository.upsertLocation({
        source: "OPENAQ",
        sourceLocationId: String(location.id),
        name:
          location.name ??
          `OpenAQ location ${location.id}`,
        city: location.locality,
        region: null,
        country: location.country.name,
        latitude,
        longitude,
      });

    const openAQMeasurements =
      latestResponse.results
        .map((measurement) => {
          const sensor =
            sensorsById.get(
              measurement.sensorsId,
            );

          if (!sensor) {
            return null;
          }

          return normalizeOpenAQLatestMeasurement(
            measurement,
            sensor,
            String(location.id),
          );
        })
        .filter(
          (
            measurement,
          ): measurement is NonNullable<
            typeof measurement
          > =>
            measurement !== null,
        );

    const validatedOpenAQMeasurements =
      openAQMeasurements.map(
        validateMeasurement,
      );

    const persistedOpenAQMeasurements =
      validatedOpenAQMeasurements.map(
        (measurement) => ({
          ...measurement,
          locationId:
            persistedLocation.id,
        }),
      );

    const openAQInserted =
      await measurementRepository.insertMeasurements(
        persistedOpenAQMeasurements,
      );

    this.logger.info(
      `[ingestion] OpenAQ location=${location.id} `
        + `normalized=${validatedOpenAQMeasurements.length} `
        + `inserted=${openAQInserted}`,
    );

    try {
      const openMeteoResponse =
        await openMeteoClient.getAirQuality(
          latitude,
          longitude,
          3,
        );

      const openMeteoCurrent =
        normalizeOpenMeteoCurrent(
          openMeteoResponse,
          String(location.id),
        );

      const validatedOpenMeteoMeasurements =
        openMeteoCurrent.map(
          validateMeasurement,
        );

      const persistedOpenMeteoMeasurements =
        validatedOpenMeteoMeasurements.map(
          (measurement) => ({
            ...measurement,
            locationId:
              persistedLocation.id,
          }),
        );

      const openMeteoMeasurementsInserted =
        await measurementRepository.insertMeasurements(
          persistedOpenMeteoMeasurements,
        );

      const normalizedForecasts =
        normalizeOpenMeteoForecast(
          openMeteoResponse,
          String(location.id),
          generatedAt,
        );

      const validatedForecasts =
        normalizedForecasts.map(
          validateForecast,
        );

      const persistedForecasts =
        validatedForecasts.map(
          (forecast) => ({
            ...forecast,
            locationId:
              persistedLocation.id,
          }),
        );

      const forecastsInserted =
        await forecastRepository.insertForecasts(
          persistedForecasts,
        );

      this.logger.info(
        `[ingestion] Open-Meteo location=${location.id} `
          + `measurements_normalized=${validatedOpenMeteoMeasurements.length} `
          + `measurements_inserted=${openMeteoMeasurementsInserted} `
          + `forecasts_normalized=${validatedForecasts.length} `
          + `forecasts_inserted=${forecastsInserted}`,
      );
    } catch (error) {
      this.logger.warn(
        `[ingestion] Open-Meteo ingestion failed `
          + `for location=${location.id}; `
          + `OpenAQ data was already persisted`,
        error,
      );
    }
  }

  async runCycle(
    locationSourceIds: number[],
  ): Promise<void> {
    this.logger.info(
      "[ingestion] starting cycle",
    );

    for (const locationSourceId of locationSourceIds) {
      try {
        await this.ingestLocation(
          locationSourceId,
        );
      } catch (error) {
        this.logger.error(
          `[ingestion] failed for location=${locationSourceId}`,
          error,
        );
      }
    }

    this.logger.info(
      "[ingestion] cycle completed",
    );
  }
}