import { z } from "zod";

export const alertTypeSchema = z.enum([
  "AQI_THRESHOLD",
  "POLLUTANT_THRESHOLD",
]);

export const alertConditionSchema = z.enum([
  "GREATER_THAN",
  "LESS_THAN",
  "EQUAL_TO",
]);

export const createAlertSchema = z
  .object({
    locationId: z.string().uuid(),
    type: alertTypeSchema,
    pollutant: z
      .enum(["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"])
      .optional(),
    condition: alertConditionSchema,
    threshold: z.number().finite().nonnegative(),
    enabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === "POLLUTANT_THRESHOLD" && !data.pollutant) {
      ctx.addIssue({
        code: "custom",
        path: ["pollutant"],
        message: "Pollutant is required for POLLUTANT_THRESHOLD alerts",
      });
    }

    if (data.type === "AQI_THRESHOLD" && data.pollutant) {
      ctx.addIssue({
        code: "custom",
        path: ["pollutant"],
        message: "Pollutant must not be provided for AQI_THRESHOLD alerts",
      });
    }
  });

export type CreateAlertInput = z.infer<typeof createAlertSchema>;

export const alertResponseSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  type: alertTypeSchema,
  pollutant: z.string().nullable(),
  condition: alertConditionSchema,
  threshold: z.number(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AlertResponse = z.infer<typeof alertResponseSchema>;

export const updateAlertSchema = z.object({
  enabled: z.boolean(),
});

export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;