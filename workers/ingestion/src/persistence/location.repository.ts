import type { Pool } from "pg";

export interface UpsertLocationInput {
  source: string;
  sourceLocationId: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface LocationRecord {
  id: string;
  source: string;
  sourceLocationId: string;
}

export class LocationRepository {
  constructor(private readonly db: Pool) {}

  async upsertLocation(
    input: UpsertLocationInput,
  ): Promise<LocationRecord> {
    const result = await this.db.query<LocationRecord>(
      `
        INSERT INTO locations (
          source,
          source_location_id,
          name,
          city,
          region,
          country,
          latitude,
          longitude,
          geom
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
          ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography
        )
        ON CONFLICT (source, source_location_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          region = EXCLUDED.region,
          country = EXCLUDED.country,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          geom = EXCLUDED.geom,
          updated_at = NOW()
        RETURNING
          id,
          source,
          source_location_id AS "sourceLocationId"
      `,
      [
        input.source,
        input.sourceLocationId,
        input.name,
        input.city,
        input.region,
        input.country,
        input.latitude,
        input.longitude,
      ],
    );

    const location = result.rows[0];

    if (!location) {
      throw new Error(
        `Failed to upsert location ${input.source}:${input.sourceLocationId}`,
      );
    }

    return location;
  }
}