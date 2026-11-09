import { z } from "zod";

export const pollutantSchema = z.enum([
  "PM2.5",
  "PM10",
  "NO2",
  "O3",
  "SO2",
  "CO",
]);

export const createMeasurementSchema = z.object({
  locationId: z.string().uuid(),
  measuredAt: z.coerce.date(),
  pollutant: pollutantSchema,
  value: z.number().finite(),
  unit: z.string().min(1),
  source: z.string().min(1),
  sourceMeasurementId: z.string().optional(),
  rawData: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMeasurementInput = z.infer<
  typeof createMeasurementSchema
>;