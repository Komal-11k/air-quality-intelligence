import { Pool } from "pg";
import { env } from "../../config/env.js";

const isProductionDatabase = env.DATABASE_URL.includes(
  "tsdb.cloud.timescale.com",
);

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: isProductionDatabase
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

export const checkDatabaseConnection = async () => {
  const result = await db.query("SELECT NOW() AS current_time");
  return result.rows[0];
};