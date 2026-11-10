import {
    calculateCoordinateAqi,
    calculateCurrentAqi,
  } from "../aqi/aqi-current.service.js";
  
  import type {
    HealthAdviceQuery,
    HealthAdviceResponse,
  } from "./health.schema.js";
  
  import {
    getHealthRule,
    getPollutantAdvice,
  } from "./health.rules.js";
  
  type AqiData = {
    aqi: number;
    category: string;
    dominantPollutant: string;
    measurements: Array<{
      pollutant: string;
      value: number;
      unit: string;
      source: string;
      dataType: "ACTUAL" | "ESTIMATED" | "FORECAST";
      measuredAt: string | Date;
    }>;
  };
  
  const buildHealthAdvice = (
    data: AqiData,
  ): HealthAdviceResponse => {
    const rule = getHealthRule(data.category);
  
    const dominantMeasurement = data.measurements.find(
      (measurement) =>
        measurement.pollutant.toLowerCase().replace(/[.\s-]/g, "") ===
        data.dominantPollutant.toLowerCase().replace(/[.\s-]/g, ""),
    );
  
    const rawMeasuredAt = dominantMeasurement?.measuredAt ?? data.measurements[0]?.measuredAt;

    const measuredAt = rawMeasuredAt ? new Date(rawMeasuredAt).toISOString() : new Date().toISOString();
  
    const source =
      dominantMeasurement?.source ??
      data.measurements[0]?.source ??
      "UNKNOWN";
  
    const dataType =
      dominantMeasurement?.dataType ??
      data.measurements[0]?.dataType ??
      "ESTIMATED";
  
    return {
      aqi: data.aqi,
      category: data.category,
      dominantPollutant: data.dominantPollutant,
  
      overallMessage: rule.overallMessage,
  
      generalPublic: rule.generalPublic,
      sensitiveGroups: rule.sensitiveGroups,
  
      outdoorActivity: rule.outdoorActivity,
  
      precautions: rule.precautions,
  
      pollutantAdvice: {
        pollutant: data.dominantPollutant,
        message: getPollutantAdvice(data.dominantPollutant),
      },
  
      source,
      dataType,
      measuredAt,
  
      disclaimer:
        "This information provides general air-quality guidance and is not a medical diagnosis or substitute for professional medical advice.",
    };
  };
  
  export const getHealthAdvice = async (
    query: HealthAdviceQuery,
  ): Promise<HealthAdviceResponse> => {
    let aqiData: AqiData;
  
    if (query.locationId) {
      aqiData = await calculateCurrentAqi(
        query.locationId,
      );
    } else {
      aqiData = await calculateCoordinateAqi(
        query.latitude!,
        query.longitude!,
      );
    }
  
    return buildHealthAdvice(aqiData);
  };