import { db } from "../../infrastructure/database/client.js";
import type { CreateLocationInput } from "./locations.schema.js";

export const createLocation = async (input: CreateLocationInput) => {
  const result = await db.query(
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
      RETURNING
        id,
        source,
        source_location_id AS "sourceLocationId",
        name,
        city,
        region,
        country,
        latitude,
        longitude,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.source,
      input.sourceLocationId,
      input.name,
      input.city ?? null,
      input.region ?? null,
      input.country ?? null,
      input.latitude,
      input.longitude,
    ],
  );

  return result.rows[0];
};

export const getLocations = async () => {
  const result = await db.query(`
    SELECT
      id,
      source,
      source_location_id AS "sourceLocationId",
      name,
      city,
      region,
      country,
      latitude,
      longitude,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM locations
    ORDER BY name ASC
  `);

  return result.rows;
};