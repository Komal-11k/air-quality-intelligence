import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  OPENAQ_API_KEY: z.string().min(1).optional(),

  GEMINI_API_KEY: z.string().min(1)
});

export const env = envSchema.parse(process.env);