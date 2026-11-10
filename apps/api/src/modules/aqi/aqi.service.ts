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
    { concentrationLow: 30, concentrationHigh: 60, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 60, concentrationHigh: 90, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 90, concentrationHigh: 120, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 120, concentrationHigh: 250, aqiLow: 301, aqiHigh: 400 },
    { concentrationLow: 250, concentrationHigh: Infinity, aqiLow: 401, aqiHigh: 500 },
  ],

  pm10: [
    { concentrationLow: 0, concentrationHigh: 50, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 50, concentrationHigh: 100, aqiLow: 51, aqiHigh: 100 },
    {
      concentrationLow: 100,
      concentrationHigh: 250,
      aqiLow: 101,
      aqiHigh: 200,
    },
    {
      concentrationLow: 250,
      concentrationHigh: 350,
      aqiLow: 201,
      aqiHigh: 300,
    },
    {
      concentrationLow: 350,
      concentrationHigh: 430,
      aqiLow: 301,
      aqiHigh: 400,
    },
    {
      concentrationLow: 430,
      concentrationHigh: Infinity,
      aqiLow: 401,
      aqiHigh: 500,
    },
  ],

  no2: [
    { concentrationLow: 0, concentrationHigh: 40, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 40, concentrationHigh: 80, aqiLow: 51, aqiHigh: 100 },
    {
      concentrationLow: 80,
      concentrationHigh: 180,
      aqiLow: 101,
      aqiHigh: 200,
    },
    {
      concentrationLow: 180,
      concentrationHigh: 280,
      aqiLow: 201,
      aqiHigh: 300,
    },
    {
      concentrationLow: 280,
      concentrationHigh: 400,
      aqiLow: 301,
      aqiHigh: 400,
    },
    {
      concentrationLow: 400,
      concentrationHigh: Infinity,
      aqiLow: 401,
      aqiHigh: 500,
    },
  ],

  so2: [
    { concentrationLow: 0, concentrationHigh: 40, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 40, concentrationHigh: 80, aqiLow: 51, aqiHigh: 100 },
    {
      concentrationLow: 80,
      concentrationHigh: 380,
      aqiLow: 101,
      aqiHigh: 200,
    },
    {
      concentrationLow: 380,
      concentrationHigh: 800,
      aqiLow: 201,
      aqiHigh: 300,
    },
    {
      concentrationLow: 800,
      concentrationHigh: 1600,
      aqiLow: 301,
      aqiHigh: 400,
    },
    {
      concentrationLow: 1600,
      concentrationHigh: Infinity,
      aqiLow: 401,
      aqiHigh: 500,
    },
  ],

  co: [
    { concentrationLow: 0, concentrationHigh: 1, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 1, concentrationHigh: 2, aqiLow: 51, aqiHigh: 100 },
    { concentrationLow: 2, concentrationHigh: 10, aqiLow: 101, aqiHigh: 200 },
    { concentrationLow: 10, concentrationHigh: 17, aqiLow: 201, aqiHigh: 300 },
    { concentrationLow: 17, concentrationHigh: 34, aqiLow: 301, aqiHigh: 400 },
    {
      concentrationLow: 34,
      concentrationHigh: Infinity,
      aqiLow: 401,
      aqiHigh: 500,
    },
  ],

  o3: [
    { concentrationLow: 0, concentrationHigh: 50, aqiLow: 0, aqiHigh: 50 },
    { concentrationLow: 50, concentrationHigh: 100, aqiLow: 51, aqiHigh: 100 },
    {
      concentrationLow: 100,
      concentrationHigh: 168,
      aqiLow: 101,
      aqiHigh: 200,
    },
    {
      concentrationLow: 168,
      concentrationHigh: 208,
      aqiLow: 201,
      aqiHigh: 300,
    },
    {
      concentrationLow: 208,
      concentrationHigh: 748,
      aqiLow: 301,
      aqiHigh: 400,
    },
    {
      concentrationLow: 748,
      concentrationHigh: Infinity,
      aqiLow: 401,
      aqiHigh: 500,
    },
  ],
};

const calculateSubIndex = (
  pollutant: Pollutant,
  concentration: number,
): number => {
  if (!Number.isFinite(concentration) || concentration < 0) {
    throw new Error(
      `Invalid ${pollutant} concentration: ${concentration}`,
    );
  }

  const pollutantBreakpoints = breakpoints[pollutant];

  const breakpoint = pollutantBreakpoints.find(
    (item) =>
      concentration >= item.concentrationLow &&
      concentration <= item.concentrationHigh,
  );

  if (!breakpoint) {
    return 500;
  }

  if (breakpoint.concentrationHigh === Infinity) {
    return 500;
  }

  const {
    concentrationLow,
    concentrationHigh,
    aqiLow,
    aqiHigh,
  } = breakpoint;

  const subIndex =
    ((aqiHigh - aqiLow) /
      (concentrationHigh - concentrationLow)) *
      (concentration - concentrationLow) +
    aqiLow;

  return Math.max(0, Math.min(500, Math.round(subIndex)));
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