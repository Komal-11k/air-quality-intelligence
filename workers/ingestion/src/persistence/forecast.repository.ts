import type { Pool } from "pg";
import type { ValidatedForecast } from "../validation/forecast.schema.js";

export interface PersistForecastInput extends ValidatedForecast {
  locationId: string;
}

export class ForecastRepository {
  constructor(private readonly db: Pool) {}

  async insertForecast(
    forecast: PersistForecastInput,
  ): Promise<void> {
    await this.db.query(
      `
        INSERT INTO forecasts (
          location_id,
          generated_at,
          forecast_for,
          pollutant,
          predicted_value,
          unit,
          source,
          model_version,
          prediction_lower,
          prediction_upper,
          raw_data
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        )
        ON CONFLICT (
          source,
          location_id,
          forecast_for,
          pollutant
        )
        DO UPDATE SET
          generated_at = EXCLUDED.generated_at,
          predicted_value = EXCLUDED.predicted_value,
          unit = EXCLUDED.unit,
          model_version = EXCLUDED.model_version,
          prediction_lower = EXCLUDED.prediction_lower,
          prediction_upper = EXCLUDED.prediction_upper,
          raw_data = EXCLUDED.raw_data
      `,
      [
        forecast.locationId,
        forecast.generatedAt,
        forecast.forecastFor,
        forecast.pollutant,
        forecast.predictedValue,
        forecast.unit,
        forecast.source,
        forecast.modelVersion,
        forecast.predictionLower,
        forecast.predictionUpper,
        forecast.rawData,
      ],
    );
  }

  async insertForecasts(
    forecasts: PersistForecastInput[],
  ): Promise<number> {
    if (forecasts.length === 0) {
      return 0;
    }

    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      let affected = 0;

      for (const forecast of forecasts) {
        const result = await client.query(
          `
            INSERT INTO forecasts (
              location_id,
              generated_at,
              forecast_for,
              pollutant,
              predicted_value,
              unit,
              source,
              model_version,
              prediction_lower,
              prediction_upper,
              raw_data
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11
            )
            ON CONFLICT (
              source,
              location_id,
              forecast_for,
              pollutant
            )
            DO UPDATE SET
              generated_at = EXCLUDED.generated_at,
              predicted_value = EXCLUDED.predicted_value,
              unit = EXCLUDED.unit,
              model_version = EXCLUDED.model_version,
              prediction_lower = EXCLUDED.prediction_lower,
              prediction_upper = EXCLUDED.prediction_upper,
              raw_data = EXCLUDED.raw_data
          `,
          [
            forecast.locationId,
            forecast.generatedAt,
            forecast.forecastFor,
            forecast.pollutant,
            forecast.predictedValue,
            forecast.unit,
            forecast.source,
            forecast.modelVersion,
            forecast.predictionLower,
            forecast.predictionUpper,
            forecast.rawData,
          ],
        );

        affected += result.rowCount ?? 0;
      }

      await client.query("COMMIT");

      return affected;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}