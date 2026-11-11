import type {
  ForecastQuery,
  ForecastResponse,
} from "./forecast.schema.js";
import {
  getForecastByCoordinates,
} from "../../infrastructure/external-apis/openmeteo.client.js";

const POLLUTANTS = [
  {
    key: "pm2_5",
    name: "PM2.5",
  },
  {
    key: "pm10",
    name: "PM10",
  },
  {
    key: "nitrogen_dioxide",
    name: "NO2",
  },
  {
    key: "sulphur_dioxide",
    name: "SO2",
  },
  {
    key: "carbon_monoxide",
    name: "CO",
  },
  {
    key: "ozone",
    name: "O3",
  },
] as const;

export const getForecast = async (
  query: ForecastQuery,
): Promise<ForecastResponse> => {
  const response =
    await getForecastByCoordinates(
      query.latitude,
      query.longitude,
      query.hours,
    );

  const forecast: ForecastResponse["forecast"] =
    [];

  for (
    let index = 0;
    index < response.hourly.time.length;
    index += 1
  ) {
    const timestamp =
      response.hourly.time[index];

    if (!timestamp) {
      continue;
    }

    for (const pollutant of POLLUTANTS) {
      const values =
        response.hourly[pollutant.key];

      const value = values?.[index];

      if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      const unit =
        response.hourly_units[
          pollutant.key
        ] ?? "";

      forecast.push({
        timestamp: new Date(
          timestamp,
        ).toISOString(),
        pollutant: pollutant.name,
        predictedValue: value,
        unit,
        source: "OPEN_METEO",
        modelVersion: null,
        predictionLower: null,
        predictionUpper: null,
      });
    }
  }

  return {
    latitude: response.latitude,
    longitude: response.longitude,
    forecast,
  };
};