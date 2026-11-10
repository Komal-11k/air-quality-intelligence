import type { Pool } from "pg";
import type { ValidatedMeasurement } from "../validation/measurement.schema.js";

export interface PersistMeasurementInput extends ValidatedMeasurement {
  locationId: string;
}

export class MeasurementRepository {
  constructor(private readonly db: Pool) {}

  async insertMeasurement(
    measurement: PersistMeasurementInput,
  ): Promise<void> {
    await this.db.query(
      `
        INSERT INTO measurements (
          location_id,
          measured_at,
          pollutant,
          value,
          unit,
          source,
          source_measurement_id,
          raw_data,
          data_type
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
          $9
        )
        ON CONFLICT (
          source,
          source_measurement_id,
          measured_at
        )
        WHERE source_measurement_id IS NOT NULL
        DO NOTHING
      `,
      [
        measurement.locationId,
        measurement.measuredAt,
        measurement.pollutant,
        measurement.value,
        measurement.unit,
        measurement.source,
        measurement.sourceMeasurementId,
        measurement.rawData,
        measurement.dataType,
      ],
    );
  }

  async insertMeasurements(
    measurements: PersistMeasurementInput[],
  ): Promise<number> {
    if (measurements.length === 0) {
      return 0;
    }

    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      let inserted = 0;

      for (const measurement of measurements) {
        const result = await client.query(
          `
            INSERT INTO measurements (
              location_id,
              measured_at,
              pollutant,
              value,
              unit,
              source,
              source_measurement_id,
              raw_data,
              data_type
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
              $9
            )
            ON CONFLICT (
              source,
              source_measurement_id,
              measured_at
            )
            WHERE source_measurement_id IS NOT NULL
            DO NOTHING
          `,
          [
            measurement.locationId,
            measurement.measuredAt,
            measurement.pollutant,
            measurement.value,
            measurement.unit,
            measurement.source,
            measurement.sourceMeasurementId,
            measurement.rawData,
            measurement.dataType,
          ],
        );

        inserted += result.rowCount ?? 0;
      }

      await client.query("COMMIT");

      return inserted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}