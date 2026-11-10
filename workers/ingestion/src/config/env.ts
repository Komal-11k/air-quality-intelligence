import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1),

  OPENAQ_API_KEY: z.string().min(1),

  INGESTION_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),

  OPENAQ_REQUEST_LIMIT: z.coerce.number().int().positive().max(1000).default(100),

  OPENAQ_WORLDWIDE_MAX_AGE_HOURS: z.coerce
  .number()
  .positive()
  .default(24),

  OPENAQ_MIN_LONGITUDE: z.coerce.number().min(-180).max(180),
  OPENAQ_MIN_LATITUDE: z.coerce.number().min(-90).max(90),
  OPENAQ_MAX_LONGITUDE: z.coerce.number().min(-180).max(180),
  OPENAQ_MAX_LATITUDE: z.coerce.number().min(-90).max(90),

  OPENAQ_LOCATION_IDS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
});

export const env = envSchema.parse(process.env);