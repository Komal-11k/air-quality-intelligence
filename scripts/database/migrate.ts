import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { env } from "../../apps/api/src/config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "../../database/migrations");

const client = new Client({
  connectionString: env.DATABASE_URL,
});

const run = async () => {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    const existing = await client.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [filename],
    );

    if ((existing.rowCount ?? 0) > 0) {
      console.log(`Skipping ${filename}`);
      continue;
    }

    const sql = await fs.readFile(
      path.join(migrationsDir, filename),
      "utf8",
    );

    console.log(`Applying ${filename}...`);

    await client.query("BEGIN");

    try {
      await client.query(sql);

      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [filename],
      );

      await client.query("COMMIT");

      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  await client.end();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await client.end().catch(() => {});
  process.exit(1);
});