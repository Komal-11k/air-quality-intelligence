import type { OpenAQMeasurement } from "../providers/openaq/openaq.types.js";
import type { NormalizedMeasurement } from "./measurement.types.js";

const POLLUTANT_MAP: Record<string, NormalizedMeasurement["pollutant"]> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO2",
  o3: "O3",
  so2: "SO2",
  co: "CO",
};

export const normalizeOpenAQMeasurement = (
  measurement: OpenAQMeasurement,
  sensorId: number,
  locationSourceId: string,
): NormalizedMeasurement | null => {
  if (
    measurement.value === null ||
    measurement.period?.datetimeFrom?.utc === undefined
  ) {
    return null;
  }

  const pollutant = POLLUTANT_MAP[measurement.parameter.name.toLowerCase()];

  if (!pollutant) {
    return null;
  }

  const measuredAt = new Date(measurement.period.datetimeFrom.utc);

  if (Number.isNaN(measuredAt.getTime())) {
    return null;
  }

  const sourceMeasurementId = [
    "openaq",
    sensorId,
    measurement.parameter.id,
    measuredAt.toISOString(),
  ].join(":");

  return {
    locationSourceId,
    measuredAt,
    pollutant,
    value: measurement.value,
    unit: measurement.parameter.units,
    source: "OPENAQ",
    sourceMeasurementId,
    dataType: "ACTUAL",
    rawData: measurement,
  };
};