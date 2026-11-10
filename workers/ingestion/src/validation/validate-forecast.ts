import {
    normalizedForecastSchema,
    type ValidatedForecast,
  } from "./forecast.schema.js";
  import type { NormalizedForecast } from "../normalization/forecast.types.js";
  
  export const validateForecast = (
    forecast: NormalizedForecast,
  ): ValidatedForecast => {
    return normalizedForecastSchema.parse(forecast);
  };