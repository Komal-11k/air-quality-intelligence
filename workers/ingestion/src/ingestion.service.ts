import { normalizeOpenAQLatestMeasurement } from "./normalization/openaq-latest.normalizer.js";
import { normalizeOpenMeteoCurrent } from "./normalization/openmeteo-current.normalizer.js";
import { normalizeOpenMeteoForecast } from "./normalization/openmeteo.normalizer.js";
import { validateMeasurement } from "./validation/validate-measurement.js";
import { validateForecast } from "./validation/validate-forecast.js";

import type {
  OpenAQLocation,
  OpenAQLatestResponse,
  OpenAQParameterLatestResponse,
  OpenAQParametersResponse,
  OpenAQSensorResponse,
} from "./providers/openaq/openaq.types.js";
import { normalizeOpenAQParameterLatestMeasurement } from "./normalization/openaq-parameter-latest.normalizer.js";
import type { OpenMeteoAirQualityResponse } from "./providers/openmeteo/openmeteo.types.js";
import type { UpsertLocationInput } from "./persistence/location.repository.js";
import type { LocationRecord } from "./persistence/location.repository.js";
import type { PersistMeasurementInput } from "./persistence/measurement.repository.js";
import type { PersistForecastInput } from "./persistence/forecast.repository.js";

export interface OpenAQClientPort {
  getLocation(
    locationId: number,
  ): Promise<OpenAQLocation>;

  getSensors(
    locationId: number,
    limit?: number,
  ): Promise<OpenAQSensorResponse>;

  getLatestMeasurements(
    locationId: number,
  ): Promise<OpenAQLatestResponse>;

  getLocations(
    minLongitude: number,
    minLatitude: number,
    maxLongitude: number,
    maxLatitude: number,
    limit?: number,
  ): Promise<OpenAQLocation[]>;

  getParameters(
    limit?: number,
  ): Promise<OpenAQParametersResponse>;
  
  getParameterLatest(
    parameterId: number,
    page?: number,
    limit?: number,
  ): Promise<OpenAQParameterLatestResponse>;
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

  upsertLocations(
    inputs: UpsertLocationInput[],
  ): Promise<LocationRecord[]>;
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
  openAQWorldwideMaxAgeHours: number;
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
    ingestOpenMeteo = true,
  ): Promise<void> {
    const location =
      await this.dependencies.openAQClient.getLocation(
        locationSourceId,
      );

      await this.ingestLocationData(
        location,
        ingestOpenMeteo,
      );
  }

  private async ingestLocationData(
    location: OpenAQLocation,
    ingestOpenMeteo = true,
  ): Promise<void> {
    const {
      openAQClient,
      openMeteoClient,
      locationRepository,
      measurementRepository,
      forecastRepository,
    } = this.dependencies;

    const generatedAt = new Date();

    const latitude = location.coordinates.latitude;
    const longitude = location.coordinates.longitude;

    if (latitude === null || longitude === null) {
      throw new Error(
        `OpenAQ location ${location.id} has missing coordinates`,
      );
    }

    const sensorsResponse =
      await openAQClient.getSensors(
        location.id,
        100,
      );

    const latestResponse =
      await openAQClient.getLatestMeasurements(
        location.id,
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
    if (ingestOpenMeteo) {
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
    } 
    catch (error) {
      this.logger.warn(
        `[ingestion] Open-Meteo ingestion failed `
          + `for location=${location.id}; `
          + `OpenAQ data was already persisted`,
        error,
      );
    }
  }
  }

  private async ingestWorldwideOpenAQ(): Promise<void> {
  const {
    openAQClient,
    locationRepository,
    measurementRepository,
  } = this.dependencies;

  const maxAgeHours =
    this.dependencies.openAQWorldwideMaxAgeHours;

  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new Error(
      "OPENAQ_WORLDWIDE_MAX_AGE_HOURS must be a positive number",
    );
  }

  const freshnessCutoff = new Date(
    Date.now() - maxAgeHours * 60 * 60 * 1000,
  );

  const parametersResponse =
    await openAQClient.getParameters(100);

  const requiredPollutants = [
    "PM2.5",
    "PM10",
    "NO2",
    "O3",
    "SO2",
    "CO",
  ] as const;

  const parametersByPollutant = new Map<
    string,
    { id: number; units: string }
  >();

  for (const parameter of parametersResponse.results) {
    const name = parameter.name.toLowerCase();

    let pollutant:
      | (typeof requiredPollutants)[number]
      | null = null;

    if (name === "pm25") {
      pollutant = "PM2.5";
    } else if (name === "pm10") {
      pollutant = "PM10";
    } else if (name === "no2") {
      pollutant = "NO2";
    } else if (name === "o3") {
      pollutant = "O3";
    } else if (name === "so2") {
      pollutant = "SO2";
    } else if (name === "co") {
      pollutant = "CO";
    }

    if (
      pollutant &&
      parameter.units === "µg/m³" &&
      !parametersByPollutant.has(pollutant)
    ) {
      parametersByPollutant.set(pollutant, {
        id: parameter.id,
        units: parameter.units,
      });
    }
  }

  for (const pollutant of requiredPollutants) {
    const parameter =
      parametersByPollutant.get(pollutant);

    if (!parameter) {
      this.logger.warn(
        `[ingestion] OpenAQ worldwide parameter not found for ${pollutant}`,
      );
      continue;
    }

    try {
      let page = 1;
      let totalFound: number | null = null;

      const latestByLocation = new Map<
        string,
        OpenAQParameterLatestResponse["results"][number]
      >();

      while (true) {
        const response =
          await openAQClient.getParameterLatest(
            parameter.id,
            page,
            1000,
          );

        if (totalFound === null) {
          const found = Number(response.meta.found);

          if (Number.isFinite(found)) {
            totalFound = found;
          }
        }

        for (const measurement of response.results) {
          const measuredAt = new Date(
            measurement.datetime.utc,
          );

          if (
            Number.isNaN(measuredAt.getTime()) ||
            measuredAt < freshnessCutoff ||
            measurement.value === null
          ) {
            continue;
          }

          const locationKey = String(
            measurement.locationsId,
          );

          const existing =
            latestByLocation.get(locationKey);

          if (!existing) {
            latestByLocation.set(
              locationKey,
              measurement,
            );
            continue;
          }

          const existingTime = new Date(
            existing.datetime.utc,
          );

          if (measuredAt > existingTime) {
            latestByLocation.set(
              locationKey,
              measurement,
            );
          }
        }

        const reachedEnd =
          response.results.length === 0 ||
          (totalFound !== null &&
            page * response.meta.limit >= totalFound) ||
          response.results.length < response.meta.limit;

        if (reachedEnd) {
          break;
        }

        page += 1;
      }

      const normalizedMeasurements =
        Array.from(latestByLocation.values())
          .map((measurement) =>
            normalizeOpenAQParameterLatestMeasurement(
              measurement,
              pollutant,
              parameter.units,
              parameter.id,
            ),
          )
          .filter(
            (
              measurement,
            ): measurement is NonNullable<
              typeof measurement
            > => measurement !== null,
          );

      const validatedMeasurements =
        normalizedMeasurements.map(
          validateMeasurement,
        );

      const locationInputsBySourceId =
        new Map<string, UpsertLocationInput>();

      for (const measurement of validatedMeasurements) {
        const sourceLocationId =
          measurement.locationSourceId;

        const sourceMeasurement =
          latestByLocation.get(sourceLocationId);

        if (!sourceMeasurement) {
          continue;
        }

        const latitude =
          sourceMeasurement.coordinates.latitude;

        const longitude =
          sourceMeasurement.coordinates.longitude;

        if (
          latitude === null ||
          latitude === undefined ||
          longitude === null ||
          longitude === undefined
        ) {
          continue;
        }

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          continue;
        }

        if (
          !locationInputsBySourceId.has(
            sourceLocationId,
          )
        ) {
          locationInputsBySourceId.set(
            sourceLocationId,
            {
              source: "OPENAQ",
              sourceLocationId,
              name:
                `OpenAQ location ${sourceLocationId}`,
              city: null,
              region: null,
              country: null,
              latitude,
              longitude,
            },
          );
        }
      }

      const locationInputs =
        Array.from(
          locationInputsBySourceId.values(),
        );

      const persistedLocations =
        await locationRepository.upsertLocations(
          locationInputs,
        );

      const locationIdBySourceLocationId =
        new Map<string, string>();

      for (const location of persistedLocations) {
        locationIdBySourceLocationId.set(
          location.sourceLocationId,
          location.id,
        );
      }

      const persistedMeasurements: PersistMeasurementInput[] =
        [];

      for (const measurement of validatedMeasurements) {
        const locationId =
          locationIdBySourceLocationId.get(
            measurement.locationSourceId,
          );

        if (!locationId) {
          continue;
        }

        persistedMeasurements.push({
          ...measurement,
          locationId,
        });
      }

      const inserted =
        await measurementRepository.insertMeasurements(
          persistedMeasurements,
        );

      this.logger.info(
        `[ingestion] OpenAQ worldwide pollutant=${pollutant} ` +
          `pages=${page} ` +
          `fresh_locations=${persistedLocations.length} ` +
          `measurements=${persistedMeasurements.length} ` +
          `inserted=${inserted}`,
      );
    } catch (error) {
      this.logger.warn(
        `[ingestion] OpenAQ worldwide ingestion failed ` +
          `for pollutant=${pollutant}; other pollutants will continue`,
        error,
      );
    }
  }
}

  async runCycle(
    locationSourceIds: number[],
    bounds?: {
      minLongitude: number;
      minLatitude: number;
      maxLongitude: number;
      maxLatitude: number;
    },
    options: {
      ingestOpenMeteo?: boolean;
      ingestWorldwideOpenAQ?: boolean;
    } = {},
  ): Promise<void> {
    this.logger.info(
      "[ingestion] starting cycle",
    );
    const ingestOpenMeteo = options.ingestOpenMeteo ?? true;
    const ingestWorldwideOpenAQ = options.ingestWorldwideOpenAQ ?? false;

    if (bounds) {
      let discoveredLocations: OpenAQLocation[];

      try {
        discoveredLocations =
          await this.dependencies.openAQClient.getLocations(
            bounds.minLongitude,
            bounds.minLatitude,
            bounds.maxLongitude,
            bounds.maxLatitude,
            100,
          );
      } catch (error) {
        this.logger.error(
          "[ingestion] OpenAQ location discovery failed",
          error,
        );

        return;
      }

      const uniqueLocations = Array.from(
        new Map(
          discoveredLocations.map(
            (location) => [
              location.id,
              location,
            ],
          ),
        ).values(),
      );

      this.logger.info(
        `[ingestion] OpenAQ discovered=${uniqueLocations.length} `
          + `locations in configured bounding box`,
      );

      for (const location of uniqueLocations) {
        try {
          await this.ingestLocationData(location, ingestOpenMeteo);
        } catch (error) {
          this.logger.error(
            `[ingestion] failed for location=${location.id}`,
            error,
          );
        }
      }
    } else {
      for (const locationSourceId of locationSourceIds) {
        try {
          await this.ingestLocation(
            locationSourceId,
            ingestOpenMeteo,
          );
        } catch (error) {
          this.logger.error(
            `[ingestion] failed for location=${locationSourceId}`,
            error,
          );
        }
      }
    }

    if (ingestWorldwideOpenAQ) {
      try {
        await this.ingestWorldwideOpenAQ();
      } catch (error) {
        this.logger.error(
          "[ingestion] worldwide OpenAQ ingestion failed",
          error,
        );
      }
    }

    this.logger.info(
      "[ingestion] cycle completed",
    );
  }
}