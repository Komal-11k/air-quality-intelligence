import { z } from "zod";

export const healthAdviceQuerySchema = z
  .object({
    locationId: z.string().uuid().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.locationId) ||
      (value.latitude !== undefined && value.longitude !== undefined),
    {
      message:
        "Provide either locationId or both latitude and longitude.",
    },
  )
  .refine(
    (value) =>
      !value.locationId ||
      (value.latitude === undefined && value.longitude === undefined),
    {
      message:
        "Provide either locationId or coordinates, not both.",
    },
  );

export const healthAdviceResponseSchema = z.object({
  aqi: z.number().int().min(0).max(500),
  category: z.string(),
  dominantPollutant: z.string(),

  overallMessage: z.string(),

  generalPublic: z.array(z.string()),
  sensitiveGroups: z.array(z.string()),

  outdoorActivity: z.object({
    level: z.enum([
      "normal",
      "caution",
      "reduce",
      "avoid",
    ]),
    recommendation: z.string(),
  }),

  precautions: z.array(z.string()),

  pollutantAdvice: z.object({
    pollutant: z.string(),
    message: z.string(),
  }),

  source: z.string(),
  dataType: z.enum(["ACTUAL", "ESTIMATED", "FORECAST"]),
  measuredAt: z.string(),

  disclaimer: z.string(),
});

export type HealthAdviceQuery = z.infer<
  typeof healthAdviceQuerySchema
>;

export type HealthAdviceResponse = z.infer<
  typeof healthAdviceResponseSchema
>;