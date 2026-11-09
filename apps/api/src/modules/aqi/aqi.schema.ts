import { z } from "zod";

export const aqiInputSchema = z.object({
  pm25: z.number().nonnegative().optional(),
  pm10: z.number().nonnegative().optional(),
  no2: z.number().nonnegative().optional(),
  so2: z.number().nonnegative().optional(),
  co: z.number().nonnegative().optional(),
  o3: z.number().nonnegative().optional(),
});

export type AqiInput = z.infer<typeof aqiInputSchema>;

export const aqiResponseSchema = z.object({
  aqi: z.number().int().nonnegative(),
  category: z.string(),
  dominantPollutant: z.string(),
});

export type AqiResponse = z.infer<typeof aqiResponseSchema>;