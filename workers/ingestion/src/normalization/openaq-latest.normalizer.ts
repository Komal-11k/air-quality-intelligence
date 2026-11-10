import type {
    OpenAQLatestMeasurement,
    OpenAQSensor,
  } from "../providers/openaq/openaq.types.js";
  import type { NormalizedMeasurement } from "./measurement.types.js";
  
  const POLLUTANT_MAP: Record<
    string,
    NormalizedMeasurement["pollutant"]
  > = {
    pm25: "PM2.5",
    pm10: "PM10",
    no2: "NO2",
    o3: "O3",
    so2: "SO2",
    co: "CO",
  };
  
  export const normalizeOpenAQLatestMeasurement = (
    measurement: OpenAQLatestMeasurement,
    sensor: OpenAQSensor,
    locationSourceId: string,
  ): NormalizedMeasurement | null => {
    if (measurement.value === null) {
      return null;
    }
  
    const pollutant = POLLUTANT_MAP[sensor.parameter.name.toLowerCase()];
  
    if (!pollutant) {
      return null;
    }
  
    const measuredAt = new Date(measurement.datetime.utc);
  
    if (Number.isNaN(measuredAt.getTime())) {
      return null;
    }
  
    return {
      locationSourceId,
      measuredAt,
      pollutant,
      value: measurement.value,
      unit: sensor.parameter.units,
      source: "OPENAQ",
      sourceMeasurementId: [
        "openaq",
        measurement.sensorsId,
        sensor.parameter.id,
        measuredAt.toISOString(),
      ].join(":"),
      dataType: "ACTUAL",
      rawData: {
        measurement,
        sensor,
      },
    };
  };