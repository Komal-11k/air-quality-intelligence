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
    }),
  ),
});

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;