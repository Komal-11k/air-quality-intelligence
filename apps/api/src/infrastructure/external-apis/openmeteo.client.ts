type OpenMeteoCurrentResponse = {
    latitude: number;
    longitude: number;
    current: {
      time: string;
      pm2_5?: number;
      pm10?: number;
      carbon_monoxide?: number;
      nitrogen_dioxide?: number;
      sulphur_dioxide?: number;
      ozone?: number;
    };
    current_units: {
      pm2_5?: string;
      pm10?: string;
      carbon_monoxide?: string;
      nitrogen_dioxide?: string;
      sulphur_dioxide?: string;
      ozone?: string;
    };
  };
  
  export const getCurrentAirQualityByCoordinates = async (
    latitude: number,
    longitude: number,
  ): Promise<OpenMeteoCurrentResponse> => {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
      timezone: "auto",
    });
  
    const response = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`,
    );
  
    if (!response.ok) {
      throw new Error(
        `Open-Meteo request failed: ${response.status} ${response.statusText}`,
      );
    }
  
    return response.json() as Promise<OpenMeteoCurrentResponse>;
  };