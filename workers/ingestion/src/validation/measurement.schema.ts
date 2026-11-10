import { z } from "zod";

export const pollutantSchema = z.enum([
  "PM2.5",
  "PM10",
  "NO2",
  "O3",
  "SO2",
  "CO",
]);

export const measurementSourceSchema = z.enum([
  "OPENAQ",
  "OPEN_METEO",
  "ML",
]);

export const measurementDataTypeSchema = z.enum([
  "ACTUAL",
  "ESTIMATED",
  "FORECAST",
]);

export const normalizedMeasurementSchema = z.object({
  locationSourceId: z.string().min(1),

  measuredAt: z.date(),

  pollutant: pollutantSchema,

  value: z.number().finite(),

  unit: z.string().min(1).max(20),

  source: measurementSourceSchema,

  sourceMeasurementId: z.string().min(1).max(150),

  dataType: measurementDataTypeSchema,

  rawData: z.unknown(),
});

export type ValidatedMeasurement = z.infer<
  typeof normalizedMeasurementSchema
>;