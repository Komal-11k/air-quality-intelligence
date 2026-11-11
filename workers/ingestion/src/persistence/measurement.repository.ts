import type { Pool } from "pg";
import type { ValidatedMeasurement } from "../validation/measurement.schema.js";

export interface PersistMeasurementInput extends ValidatedMeasurement {
  locationId: string;
}

export class MeasurementRepository {
  constructor(private readonly db: Pool) {}

  async insertMeasurements(
    measurements: PersistMeasurementInput[],
  ): Promise<number> {
    if (measurements.length === 0) {
      return 0;
    }

    const batchSize = 500;
    let inserted = 0;

    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      for (
        let offset = 0;
        offset < measurements.length;
        offset += batchSize
      ) {
        const batch = measurements.slice(
          offset,
          offset + batchSize,
        );

        const values: unknown[] = [];
        const placeholders: string[] = [];

        for (let index = 0; index < batch.length; index += 1) {
          const measurement = batch[index];
          const base = index * 9;

          placeholders.push(
            `(
              $${base + 1},
              $${base + 2},
              $${base + 3},
              $${base + 4},
              $${base + 5},
              $${base + 6},
              $${base + 7},
              $${base + 8},
              $${base + 9}
            )`,
          );

          values.push(
            measurement.locationId,
            measurement.measuredAt,
            measurement.pollutant,
            measurement.value,
            measurement.unit,
            measurement.source,
            measurement.sourceMeasurementId,
            measurement.rawData,
            measurement.dataType,
          );
        }

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
            VALUES ${placeholders.join(",")}
            ON CONFLICT (
              source,
              source_measurement_id,
              measured_at
            )
            WHERE source_measurement_id IS NOT NULL
            DO NOTHING
          `,
          values,
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