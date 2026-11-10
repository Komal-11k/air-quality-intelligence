import type { HealthAdviceResponse } from "./health.schema.js";

type HealthRule = {
  overallMessage: string;
  generalPublic: string[];
  sensitiveGroups: string[];
  outdoorActivity: HealthAdviceResponse["outdoorActivity"];
  precautions: string[];
};

const rules: Record<
  HealthAdviceResponse["category"],
  HealthRule
> = {
  Good: {
    overallMessage:
      "Air quality is considered good. Air pollution poses little or no risk under normal conditions.",

    generalPublic: [
      "Normal outdoor activities are generally appropriate.",
      "No special air-quality precautions are normally required.",
    ],

    sensitiveGroups: [
      "Sensitive individuals can generally follow their normal routines.",
    ],

    outdoorActivity: {
      level: "normal",
      recommendation:
        "Normal outdoor exercise and activities are generally appropriate.",
    },

    precautions: [
      "Continue normal outdoor activities.",
      "Use your usual health precautions if you have a pre-existing condition.",
    ],
  },

  Satisfactory: {
    overallMessage:
      "Air quality is acceptable, although some unusually sensitive people may experience minor effects.",

    generalPublic: [
      "Most people can continue normal outdoor activities.",
      "Pay attention to symptoms if you are unusually sensitive to air pollution.",
    ],

    sensitiveGroups: [
      "People with respiratory or cardiovascular conditions should monitor how they feel during prolonged outdoor activity.",
      "Children, older adults, and people who are sensitive to pollution should consider reducing prolonged strenuous activity if symptoms occur.",
    ],

    outdoorActivity: {
      level: "normal",
      recommendation:
        "Normal outdoor activity is generally appropriate. Sensitive individuals should reduce intensity if they experience symptoms.",
    },

    precautions: [
      "Monitor symptoms during prolonged outdoor activity.",
      "Consider reducing strenuous activity if pollution-related symptoms develop.",
    ],
  },

  Moderate: {
    overallMessage:
      "Air quality may affect sensitive people, particularly during prolonged or strenuous outdoor activity.",

    generalPublic: [
      "Most people can continue outdoor activities, but prolonged strenuous exercise may increase exposure.",
      "Consider taking breaks during long outdoor activities.",
    ],

    sensitiveGroups: [
      "People with asthma or other respiratory conditions may be more affected.",
      "Children, older adults, and people with heart or lung conditions should limit prolonged strenuous outdoor activity.",
    ],

    outdoorActivity: {
      level: "caution",
      recommendation:
        "Outdoor activity is possible, but consider reducing prolonged or strenuous exercise, especially if you are sensitive to pollution.",
    },

    precautions: [
      "Reduce prolonged strenuous outdoor activity if possible.",
      "Monitor for coughing, breathing discomfort, or unusual irritation.",
      "Consider moving strenuous exercise indoors when practical.",
    ],
  },

  Poor: {
    overallMessage:
      "Air pollution is at a level where prolonged exposure can affect health, including in otherwise healthy people.",

    generalPublic: [
      "Reduce prolonged or strenuous outdoor activity.",
      "Consider moving exercise and other intensive activities indoors.",
    ],

    sensitiveGroups: [
      "People with respiratory or cardiovascular conditions should minimize prolonged outdoor exposure.",
      "Children and older adults should reduce strenuous outdoor activity.",
    ],

    outdoorActivity: {
      level: "reduce",
      recommendation:
        "Reduce outdoor exertion, particularly strenuous or prolonged exercise. Prefer cleaner indoor environments when practical.",
    },

    precautions: [
      "Limit prolonged outdoor exposure.",
      "Reduce strenuous outdoor exercise.",
      "Keep indoor air as clean as practical.",
      "Monitor symptoms and seek medical advice if significant or persistent symptoms occur.",
    ],
  },

  "Very Poor": {
    overallMessage:
      "Air pollution is at a very poor level and prolonged exposure can pose significant health risks.",

    generalPublic: [
      "Avoid prolonged or strenuous outdoor activity.",
      "Reduce unnecessary time spent in polluted outdoor environments.",
    ],

    sensitiveGroups: [
      "People with respiratory or cardiovascular conditions should avoid prolonged outdoor exposure.",
      "Children and older adults should minimize strenuous outdoor activity.",
    ],

    outdoorActivity: {
      level: "avoid",
      recommendation:
        "Avoid strenuous outdoor exercise and minimize prolonged outdoor exposure. Prefer cleaner indoor environments.",
    },

    precautions: [
      "Avoid strenuous outdoor exercise.",
      "Minimize unnecessary outdoor exposure.",
      "Keep windows closed when outdoor pollution is substantially higher than indoors, where practical.",
      "Follow your existing medical action plan if you have one.",
    ],
  },

  Severe: {
    overallMessage:
      "Air pollution is at a severe level and can pose a serious health risk to the population.",

    generalPublic: [
      "Avoid unnecessary outdoor exposure.",
      "Avoid strenuous outdoor activity.",
    ],

    sensitiveGroups: [
      "Sensitive groups should remain indoors as much as practical.",
      "People with respiratory or cardiovascular conditions should follow their existing medical action plans.",
      "Children and older adults should avoid strenuous outdoor activity.",
    ],

    outdoorActivity: {
      level: "avoid",
      recommendation:
        "Avoid outdoor exercise and minimize unnecessary outdoor exposure.",
    },

    precautions: [
      "Avoid strenuous outdoor activity.",
      "Minimize unnecessary time outdoors.",
      "Keep indoor environments as clean from outdoor pollution as practical.",
      "Follow your existing medical action plan if you have one.",
      "Seek professional medical care for severe or persistent symptoms.",
    ],
  },
};

const pollutantAdvice: Record<string, string> = {
  pm25:
    "Fine particulate matter can penetrate deeply into the respiratory system. Higher concentrations are associated with increased respiratory and cardiovascular stress.",

  pm10:
    "Coarse particulate matter can irritate the eyes, nose, throat, and respiratory system, particularly at elevated concentrations.",

  no2:
    "Nitrogen dioxide can irritate the airways and may worsen respiratory symptoms, particularly in people with asthma or other respiratory conditions.",

  so2:
    "Sulfur dioxide can irritate the respiratory system and may worsen breathing problems in sensitive individuals.",

  co:
    "Carbon monoxide reduces the blood's ability to carry oxygen. Elevated exposure can be particularly dangerous in enclosed or poorly ventilated environments.",

  o3:
    "Ground-level ozone can irritate the lungs and airways and may worsen respiratory symptoms during outdoor activity.",
};

const normalizePollutant = (pollutant: string): string => {
  return pollutant.toLowerCase().replace(/[.\s-]/g, "");
};

export const getHealthRule = (
  category: HealthAdviceResponse["category"],
): HealthRule => {
  return rules[category] ?? rules.Severe;
};

export const getPollutantAdvice = (
  pollutant: string,
): string => {
  const normalized = normalizePollutant(pollutant);

  return (
    pollutantAdvice[normalized] ??
    "Elevated concentrations of this pollutant may contribute to health effects. Consider reducing prolonged exposure when air quality is poor."
  );
};