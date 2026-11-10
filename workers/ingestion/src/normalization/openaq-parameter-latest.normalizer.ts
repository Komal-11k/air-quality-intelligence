import type { OpenAQLatestMeasurement } from "../providers/openaq/openaq.types.js";
import type { NormalizedMeasurement } from "./measurement.types.js";

export const normalizeOpenAQParameterLatestMeasurement = (
  measurement: OpenAQLatestMeasurement,
  pollutant: NormalizedMeasurement["pollutant"],
  unit: string,
  parameterId: number,
): NormalizedMeasurement | null => {
  if (measurement.value === null) {
    return null;
  }

  const measuredAt = new Date(measurement.datetime.utc);

  if (Number.isNaN(measuredAt.getTime())) {
    return null;
  }

  return {
    locationSourceId: String(measurement.locationsId),
    measuredAt,
    pollutant,
    value: measurement.value,
    unit,
    source: "OPENAQ",
    sourceMeasurementId: [
      "openaq",
      measurement.sensorsId,
      parameterId,
      measuredAt.toISOString(),
    ].join(":"),
    dataType: "ACTUAL",
    rawData: {
      measurement,
      parameter: {
        id: parameterId,
        name: pollutant,
        units: unit,
      },
    },
  };
};