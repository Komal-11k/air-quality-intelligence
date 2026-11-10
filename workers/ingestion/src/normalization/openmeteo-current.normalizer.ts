import type {
    OpenMeteoAirQualityResponse,
    OpenMeteoCurrentAirQuality,
  } from "../providers/openmeteo/openmeteo.types.js";
  import type { NormalizedMeasurement } from "./measurement.types.js";
  
  const POLLUTANTS = [
    {
      apiKey: "pm2_5",
      pollutant: "PM2.5",
      unit: "µg/m³",
    },
    {
      apiKey: "pm10",
      pollutant: "PM10",
      unit: "µg/m³",
    },
    {
      apiKey: "nitrogen_dioxide",
      pollutant: "NO2",
      unit: "µg/m³",
    },
    {
      apiKey: "ozone",
      pollutant: "O3",
      unit: "µg/m³",
    },
    {
      apiKey: "sulphur_dioxide",
      pollutant: "SO2",
      unit: "µg/m³",
    },
    {
      apiKey: "carbon_monoxide",
      pollutant: "CO",
      unit: "µg/m³",
    },
  ] as const;
  
  type PollutantKey = (typeof POLLUTANTS)[number]["apiKey"];
  
  const parseOpenMeteoTime = (value: string): Date => {
    const normalized =
      /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
        ? value
        : `${value}Z`;
  
    const date = new Date(normalized);
  
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid Open-Meteo timestamp: ${value}`);
    }
  
    return date;
  };
  
  const createSourceMeasurementId = (
    pollutant: string,
    measuredAt: Date,
  ): string =>
    [
      "open-meteo",
      "current",
      pollutant,
      measuredAt.toISOString(),
    ].join(":");
  
  export const normalizeOpenMeteoCurrent = (
    response: OpenMeteoAirQualityResponse,
    locationSourceId: string,
  ): NormalizedMeasurement[] => {
    const current: OpenMeteoCurrentAirQuality | undefined =
      response.current;
  
    if (!current) {
      return [];
    }
  
    const measuredAt = parseOpenMeteoTime(current.time);
  
    return POLLUTANTS.flatMap((pollutant) => {
      const value =
        current[pollutant.apiKey as PollutantKey];
  
      if (
        value === undefined ||
        value === null ||
        !Number.isFinite(value)
      ) {
        return [];
      }
  
      return [
        {
          locationSourceId,
          measuredAt,
          pollutant: pollutant.pollutant,
          value,
          unit: pollutant.unit,
          source: "OPEN_METEO" as const,
          sourceMeasurementId: createSourceMeasurementId(
            pollutant.pollutant,
            measuredAt,
          ),
          dataType: "ESTIMATED" as const,
          rawData: {
            time: current.time,
            interval: current.interval,
            pollutant: pollutant.apiKey,
            value,
          },
        },
      ];
    });
  };