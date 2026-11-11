import { z } from "zod";

export const forecastQuerySchema = z.object({
  locationId: z.string().uuid(),
  hours: z.coerce.number().int().positive().max(168).default(24),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;

export const forecastResponseSchema = z.object({
  locationId: z.string().uuid(),
  forecast: z.array(
    z.object({
      timestamp: z.string(),
      pollutant: z.string(),
      predictedValue: z.number(),
      unit: z.string(),
      source: z.string(),
      modelVersion: z.string().nullable(),
      predictionLower: z.number().nullable(),
      predictionUpper: z.number().nullable(),
    }),
  ),
});

export type ForecastResponse = z.infer<
  typeof forecastResponseSchema
>;