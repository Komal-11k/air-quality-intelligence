import type { Pool } from "pg";

export interface ForecastRecord {
  timestamp: string;
  pollutant: string;
  predictedValue: number;
  unit: string;
  source: string;
  modelVersion: string | null;
  predictionLower: number | null;
  predictionUpper: number | null;
}

export class ForecastRepository {
  constructor(private readonly db: Pool) {}

  async getLatestForecasts(
    locationId: string,
    hours: number,
  ): Promise<ForecastRecord[]> {
    const result = await this.db.query<{
      forecastFor: Date;
      pollutant: string;
      predictedValue: number;
      unit: string;
      source: string;
      modelVersion: string | null;
      predictionLower: number | null;
      predictionUpper: number | null;
    }>(
      `
        SELECT
          forecast_for AS "forecastFor",
          pollutant,
          predicted_value AS "predictedValue",
          unit,
          source,
          model_version AS "modelVersion",
          prediction_lower AS "predictionLower",
          prediction_upper AS "predictionUpper"
        FROM forecasts
        WHERE location_id = $1
          AND forecast_for >= NOW()
          AND forecast_for <= NOW() + ($2 * INTERVAL '1 hour')
        ORDER BY
          forecast_for ASC,
          pollutant ASC
      `,
      [locationId, hours],
    );

    return result.rows.map((row) => ({
      timestamp: row.forecastFor.toISOString(),
      pollutant: row.pollutant,
      predictedValue: row.predictedValue,
      unit: row.unit,
      source: row.source,
      modelVersion: row.modelVersion,
      predictionLower: row.predictionLower,
      predictionUpper: row.predictionUpper,
    }));
  }
}