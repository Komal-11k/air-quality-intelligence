import { db } from "../../infrastructure/database/client.js";
import { calculateAqi } from "./aqi.service.js";
import type { AqiInput } from "./aqi.schema.js";
import { getCurrentAirQualityByCoordinates } from "../../infrastructure/external-apis/openmeteo.client.js";

export const calculateCurrentAqi = async (locationId: string) => {
  const result = await db.query<{
    pollutant: string;
    value: number;
    unit: string;
    source: string;
    dataType: "ACTUAL" | "ESTIMATED" | "FORECAST";
    measuredAt: Date;
  }>(
    `
      SELECT DISTINCT ON (pollutant)
        pollutant,
        value,
        unit,
        source,
        data_type AS "dataType",
        measured_at AS "measuredAt"
      FROM measurements
      WHERE location_id = $1
        AND data_type IN ('ACTUAL', 'ESTIMATED')
      ORDER BY pollutant, measured_at DESC, id DESC
    `,
    [locationId],
  );

  const input: AqiInput = {};

  for (const row of result.rows) {
    switch (row.pollutant) {
      case "PM2.5":
        input.pm25 = row.value;
        break;

      case "PM10":
        input.pm10 = row.value;
        break;

      case "NO2":
        input.no2 = row.value;
        break;

      case "SO2":
        input.so2 = row.value;
        break;

      case "CO":
        input.co = row.value;
        break;

      case "O3":
        input.o3 = row.value;
        break;
    }
  }

  const aqi = calculateAqi(input);

  return {
    locationId,
    ...aqi,
    measurements: result.rows,
  };
};

export const calculateCoordinateAqi = async (
  latitude: number,
  longitude: number,
) => {
  const current = await getCurrentAirQualityByCoordinates(
    latitude,
    longitude,
  );

  const measurements = [
    {
      pollutant: "PM2.5",
      value: current.current.pm2_5,
      unit: current.current_units.pm2_5 ?? "µg/m³",
    },
    {
      pollutant: "PM10",
      value: current.current.pm10,
      unit: current.current_units.pm10 ?? "µg/m³",
    },
    {
      pollutant: "CO",
      value: current.current.carbon_monoxide,
      unit: current.current_units.carbon_monoxide ?? "µg/m³",
    },
    {
      pollutant: "NO2",
      value: current.current.nitrogen_dioxide,
      unit: current.current_units.nitrogen_dioxide ?? "µg/m³",
    },
    {
      pollutant: "SO2",
      value: current.current.sulphur_dioxide,
      unit: current.current_units.sulphur_dioxide ?? "µg/m³",
    },
    {
      pollutant: "O3",
      value: current.current.ozone,
      unit: current.current_units.ozone ?? "µg/m³",
    },
  ]
    .filter(
      (
        measurement,
      ): measurement is typeof measurement & {
        value: number;
      } => Number.isFinite(measurement.value),
    )
    .map((measurement) => ({
      ...measurement,
      source: "OPEN_METEO",
      dataType: "ESTIMATED" as const,
      measuredAt: current.current.time,
    }));

  const findValue = (pollutant: string) =>
    measurements.find((measurement) => measurement.pollutant === pollutant)
      ?.value;

  const coMicrograms = findValue("CO");

  const aqiInput: AqiInput = {
    pm25: findValue("PM2.5"),
    pm10: findValue("PM10"),
    no2: findValue("NO2"),
    so2: findValue("SO2"),
    o3: findValue("O3"),
    co:
      coMicrograms !== undefined
        ? coMicrograms / 1000
        : undefined,
  };

  const aqi = calculateAqi(aqiInput);

  return {
    latitude,
    longitude,
    aqi: aqi.aqi,
    category: aqi.category,
    dominantPollutant: aqi.dominantPollutant,
    measurements,
  };
};