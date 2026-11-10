import {
    normalizedMeasurementSchema,
    type ValidatedMeasurement,
  } from "./measurement.schema.js";
  import type { NormalizedMeasurement } from "../normalization/measurement.types.js";
  
  export const validateMeasurement = (
    measurement: NormalizedMeasurement,
  ): ValidatedMeasurement => {
    return normalizedMeasurementSchema.parse(measurement);
  };