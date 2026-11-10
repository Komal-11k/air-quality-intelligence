import type { Pollutant } from "./measurement.types.js";

export type ForecastSource =
  | "OPEN_METEO"
  | "ML";

export interface NormalizedForecast {
  locationSourceId: string;

  generatedAt: Date;
  forecastFor: Date;

  pollutant: Pollutant;

  predictedValue: number;
  unit: string;

  source: ForecastSource;
  modelVersion: string | null;

  predictionLower: number | null;
  predictionUpper: number | null;

  rawData: unknown;
}