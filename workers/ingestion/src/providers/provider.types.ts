export type MeasurementProvider = "openaq" | "openmeteo";

export interface ProviderMeasurement {
  provider: MeasurementProvider;
  sourceMeasurementId: string;
  measuredAt: Date;

  pollutant: string;
  value: number;
  unit: string;

  locationSourceId: string;

  latitude: number | null;
  longitude: number | null;

  rawData: unknown;
}

export interface MeasurementProviderClient {
  getMeasurements(
    locationSourceId: string,
    from: Date,
    to: Date,
  ): Promise<ProviderMeasurement[]>;
}