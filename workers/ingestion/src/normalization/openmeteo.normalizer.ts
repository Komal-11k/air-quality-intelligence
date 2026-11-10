import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoHourlyAirQuality,
} from "../providers/openmeteo/openmeteo.types.js";
import type { NormalizedForecast } from "./forecast.types.js";

const POLLUTANTS = [
  {
    apiKey: "pm2_5",
    pollutant: "PM2.5",
    unit: "µg/m³",
  },
  {
    apiKey: "pm10",
    pollutant: "PM10",
    unit: "µg/m³",
  },
  {
    apiKey: "nitrogen_dioxide",
    pollutant: "NO2",
    unit: "µg/m³",
  },
  {
    apiKey: "ozone",
    pollutant: "O3",
    unit: "µg/m³",
  },
  {
    apiKey: "sulphur_dioxide",
    pollutant: "SO2",
    unit: "µg/m³",
  },
  {
    apiKey: "carbon_monoxide",
    pollutant: "CO",
    unit: "µg/m³",
  },
] as const;

type PollutantKey = (typeof POLLUTANTS)[number]["apiKey"];

const parseOpenMeteoTime = (value: string): Date => {
  const normalized =
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? value
      : `${value}Z`;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Open-Meteo timestamp: ${value}`);
  }

  return date;
};

const createSourceForecastId = (
  pollutant: string,
  forecastFor: Date,
): string =>
  [
    "open-meteo",
    "forecast",
    pollutant,
    forecastFor.toISOString(),
  ].join(":");

const normalizeHourly = (
  hourly: OpenMeteoHourlyAirQuality,
  locationSourceId: string,
  generatedAt: Date,
): NormalizedForecast[] => {
  const forecasts: NormalizedForecast[] = [];

  for (let index = 0; index < hourly.time.length; index += 1) {
    const forecastFor = parseOpenMeteoTime(hourly.time[index]);

    // Open-Meteo may return already elapsed/current hourly values.
    // The forecasts table stores future predictions only.
    if (forecastFor <= generatedAt) {
      continue;
    }

    for (const pollutant of POLLUTANTS) {
      const value =
        hourly[pollutant.apiKey as PollutantKey][index];

      if (
        value === undefined ||
        value === null ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      forecasts.push({
        locationSourceId,
        generatedAt,
        forecastFor,
        pollutant: pollutant.pollutant,
        predictedValue: value,
        unit: pollutant.unit,
        source: "OPEN_METEO",
        modelVersion: null,
        predictionLower: null,
        predictionUpper: null,
        rawData: {
          time: hourly.time[index],
          pollutant: pollutant.apiKey,
          value,
        },
      });
    }
  }

  return forecasts;
};

export const normalizeOpenMeteoForecast = (
  response: OpenMeteoAirQualityResponse,
  locationSourceId: string,
  generatedAt: Date,
): NormalizedForecast[] => {
  if (!response.hourly) {
    return [];
  }

  return normalizeHourly(
    response.hourly,
    locationSourceId,
    generatedAt,
  );
};