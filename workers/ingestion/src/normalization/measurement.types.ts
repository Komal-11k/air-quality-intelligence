export type MeasurementSource =
  | "OPENAQ"
  | "OPEN_METEO"
  | "ML";

export type MeasurementDataType =
  | "ACTUAL"
  | "ESTIMATED"
  | "FORECAST";

export type Pollutant =
  | "PM2.5"
  | "PM10"
  | "NO2"
  | "O3"
  | "SO2"
  | "CO";

export interface NormalizedMeasurement {
  locationSourceId: string;

  measuredAt: Date;

  pollutant: Pollutant;

  value: number;

  unit: string;

  source: MeasurementSource;

  sourceMeasurementId: string;

  dataType: MeasurementDataType;

  rawData: unknown;
}