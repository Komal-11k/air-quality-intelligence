import type { AqiInput, AqiResponse } from "./aqi.schema.js";

type Pollutant = keyof AqiInput;

type Breakpoint = {
  concentrationLow: number;
  concentrationHigh: number;
  aqiLow: number;
  aqiHigh: number;
};

const breakpoints: Record<Pollutant, Breakpoint[]> = {
  pm25: [
    { concentrationLow: 0, concentrationHigh: 30, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 31, concentrationHigh: 60, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 61, concentrationHigh: 90, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 91, concentrationHigh: 120, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 121, concentrationHigh: 250, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 251, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],

  pm10: [
    { concentrationLow: 0, concentrationHigh: 50, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 51, concentrationHigh: 100, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 101, concentrationHigh: 250, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 251, concentrationHigh: 350, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 351, concentrationHigh: 430, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 431, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],

  no2: [
    { concentrationLow: 0, concentrationHigh: 40, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 41, concentrationHigh: 80, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 81, concentrationHigh: 180, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 181, concentrationHigh: 280, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 281, concentrationHigh: 400, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 401, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],

  so2: [
    { concentrationLow: 0, concentrationHigh: 40, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 41, concentrationHigh: 80, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 81, concentrationHigh: 380, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 381, concentrationHigh: 800, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 801, concentrationHigh: 1600, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 1601, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],

  co: [
    { concentrationLow: 0, concentrationHigh: 1.0, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 1.1, concentrationHigh: 2.0, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 2.1, concentrationHigh: 10, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 10.1, concentrationHigh: 17, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 17.1, concentrationHigh: 34, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 34.1, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],

  o3: [
    { concentrationLow: 0, concentrationHigh: 50, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 51, concentrationHigh: 100, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 101, concentrationHigh: 168, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 169, concentrationHigh: 208, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 209, concentrationHigh: 748, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 749, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],
};

const calculateSubIndex = (
  pollutant: Pollutant,
  concentration: number,
): number => {
  const pollutantBreakpoints = breakpoints[pollutant];

  const breakpoint = pollutantBreakpoints.find(
    (item) =>
      concentration >= item.concentrationLow &&
      concentration <= item.concentrationHigh,
  );

  if (!breakpoint) {
    return 500;
  }

  const {
    concentrationLow,
    concentrationHigh,
    aqiLow,
    aqiHigh,
  } = breakpoint;

  if (concentrationHigh === Infinity) {
    return 500;
  }

  const subIndex =
    ((aqiHigh - aqiLow) /
      (concentrationHigh - concentrationLow)) *
      (concentration - concentrationLow) +
    aqiLow;

  return Math.round(subIndex);
};

const getCategory = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
};

export const calculateAqi = (input: AqiInput): AqiResponse => {
  const availablePollutants = (
    Object.entries(input) as [Pollutant, number | undefined][]
  ).filter(([, value]) => value !== undefined);

  if (availablePollutants.length === 0) {
    throw new Error("At least one pollutant concentration is required");
  }

  const subIndices = availablePollutants.map(([pollutant, value]) => ({
    pollutant,
    aqi: calculateSubIndex(pollutant, value!),
  }));

  const dominant = subIndices.reduce((highest, current) =>
    current.aqi > highest.aqi ? current : highest,
  );

  return {
    aqi: dominant.aqi,
    category: getCategory(dominant.aqi),
    dominantPollutant: dominant.pollutant,
  };
};