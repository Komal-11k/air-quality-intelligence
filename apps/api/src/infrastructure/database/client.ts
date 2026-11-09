import { Pool } from "pg";
import { env } from "../../config/env.js";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const checkDatabaseConnection = async () => {
  const result = await db.query("SELECT NOW() AS current_time");
  return result.rows[0];
};