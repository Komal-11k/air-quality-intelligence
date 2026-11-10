import { db } from "../../infrastructure/database/client.js";
import type {
  CreateLocationInput,
  LocationsQuery,
} from "./locations.schema.js";

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

export const getLocations = async ({
  search,
  limit,
  offset,
}: LocationsQuery) => {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`
      (
        name ILIKE $${values.length}
        OR city ILIKE $${values.length}
        OR region ILIKE $${values.length}
        OR country ILIKE $${values.length}
      )
    `);
  }

  values.push(limit);
  const limitParameter = values.length;

  values.push(offset);
  const offsetParameter = values.length;

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await db.query(
    `
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
      ${whereClause}
      ORDER BY name ASC, id ASC
      LIMIT $${limitParameter}
      OFFSET $${offsetParameter}
    `,
    values,
  );

  const countResult = await db.query(
    `
      SELECT COUNT(*)::integer AS count
      FROM locations
      ${whereClause}
    `,
    values.slice(0, -2),
  );

  return {
    locations: result.rows,
    count: countResult.rows[0].count,
    limit,
    offset,
  };
};