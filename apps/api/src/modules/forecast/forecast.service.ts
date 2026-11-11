import { db } from "../../infrastructure/database/client.js";
import type {
  ForecastQuery,
  ForecastResponse,
} from "./forecast.schema.js";
import { ForecastRepository } from "./forecast.repository.js";

const forecastRepository = new ForecastRepository(db);

export const getForecast = async (
  query: ForecastQuery,
): Promise<ForecastResponse> => {
  const forecast =
    await forecastRepository.getLatestForecasts(
      query.locationId,
      query.hours,
    );

  return {
    locationId: query.locationId,
    forecast,
  };
};