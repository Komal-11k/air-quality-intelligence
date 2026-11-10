import { z } from "zod";
import { pollutantSchema } from "./measurement.schema.js";

export const forecastSourceSchema = z.enum([
  "OPEN_METEO",
  "ML",
]);

export const normalizedForecastSchema = z
  .object({
    locationSourceId: z.string().min(1),

    generatedAt: z.date(),

    forecastFor: z.date(),

    pollutant: pollutantSchema,

    predictedValue: z.number().finite(),

    unit: z.string().min(1).max(20),

    source: forecastSourceSchema,

    modelVersion: z.string().max(100).nullable(),

    predictionLower: z.number().finite().nullable(),

    predictionUpper: z.number().finite().nullable(),

    rawData: z.unknown(),
  })
  .superRefine((forecast, context) => {
    if (forecast.forecastFor < forecast.generatedAt) {
      context.addIssue({
        code: "custom",
        path: ["forecastFor"],
        message: "forecastFor must be greater than or equal to generatedAt",
      });
    }

    if (
      forecast.predictionLower !== null
      && forecast.predictionUpper !== null
      && forecast.predictionLower > forecast.predictionUpper
    ) {
      context.addIssue({
        code: "custom",
        path: ["predictionLower"],
        message:
          "predictionLower must be less than or equal to predictionUpper",
      });
    }
  });

export type ValidatedForecast = z.infer<
  typeof normalizedForecastSchema
>;