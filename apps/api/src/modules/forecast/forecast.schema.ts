import { z } from "zod";

export const forecastQuerySchema = z.object({
  latitude: z.coerce
    .number()
    .finite()
    .min(-90)
    .max(90),

  longitude: z.coerce
    .number()
    .finite()
    .min(-180)
    .max(180),

  hours: z.coerce
    .number()
    .int()
    .positive()
    .max(168)
    .default(24),
});

export type ForecastQuery =
  z.infer<typeof forecastQuerySchema>;

export const forecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),

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

export type ForecastResponse =
  z.infer<typeof forecastResponseSchema>;