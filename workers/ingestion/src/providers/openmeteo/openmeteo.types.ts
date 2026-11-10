export interface OpenMeteoCurrentAirQuality {
  time: string;
  interval: number;
  pm10: number | null;
  pm2_5: number | null;
  carbon_monoxide: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  ozone: number | null;
}

export interface OpenMeteoHourlyAirQuality {
  time: string[];
  pm10: number[];
  pm2_5: number[];
  carbon_monoxide: number[];
  nitrogen_dioxide: number[];
  sulphur_dioxide: number[];
  ozone: number[];
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: OpenMeteoCurrentAirQuality;
  hourly?: OpenMeteoHourlyAirQuality;
}
