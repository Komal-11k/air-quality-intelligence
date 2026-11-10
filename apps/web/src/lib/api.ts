const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export type AqiMeasurement = {
  pollutant: string;
  value: number;
  unit: string;
  source: string;
  dataType: "ACTUAL" | "ESTIMATED" | "FORECAST";
  measuredAt: string;
};

export type CurrentAqiResponse = {
  locationId: string;
  aqi: number;
  category: string;
  dominantPollutant: string;
  measurements: AqiMeasurement[];
};

export const api = {
  async getCurrentAqi(locationId: string): Promise<CurrentAqiResponse> {
    const response = await fetch(
      `${API_BASE_URL}/locations/${locationId}/aqi`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch current AQI: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<CurrentAqiResponse>;
  },

  async getLocations(
    query: LocationsQuery = {},
  ): Promise<LocationsResponse> {
    const params = new URLSearchParams();
  
    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }
  
    if (query.limit !== undefined) {
      params.set("limit", String(query.limit));
    }
  
    if (query.offset !== undefined) {
      params.set("offset", String(query.offset));
    }
  
    const queryString = params.toString();
  
    const response = await fetch(
      `${API_BASE_URL}/locations${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  
    if (!response.ok) {
      throw new Error(
        `Failed to fetch locations: ${response.status} ${response.statusText}`,
      );
    }
  
    return response.json() as Promise<LocationsResponse>;
  },
  async getCurrentAqiByCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<CoordinateAqiResponse> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
  
    const response = await fetch(
      `${API_BASE_URL}/aqi/current?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  
    if (!response.ok) {
      throw new Error(
        `Failed to fetch location AQI: ${response.status} ${response.statusText}`,
      );
    }
  
    return response.json() as Promise<CoordinateAqiResponse>;
  },
  async getMeasurementHistory(
    locationId: string,
    query: HistoryQuery = {},
  ): Promise<HistoryResponse> {
    const params = new URLSearchParams();
  
    if (query.from) {
      params.set("from", query.from);
    }
  
    if (query.to) {
      params.set("to", query.to);
    }
  
    if (query.pollutant) {
      params.set("pollutant", query.pollutant);
    }
  
    if (query.limit !== undefined) {
      params.set("limit", String(query.limit));
    }
  
    const queryString = params.toString();
  
    const response = await fetch(
      `${API_BASE_URL}/locations/${locationId}/history${
        queryString ? `?${queryString}` : ""
      }`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  
    if (!response.ok) {
      throw new Error(
        `Failed to fetch measurement history: ${response.status} ${response.statusText}`,
      );
    }
  
    const data = await response.json();
  
    return {
      value: Array.isArray(data?.value) ? data.value : [],
      Count:
        typeof data?.Count === "number"
          ? data.Count
          : Array.isArray(data?.value)
            ? data.value.length
            : 0,
    };
  },
  async getForecast(
    query: ForecastQuery,
  ): Promise<ForecastResponse> {
    const params = new URLSearchParams({
      locationId: query.locationId,
      hours: String(query.hours ?? 24),
    });
  
    const response = await fetch(
      `${API_BASE_URL}/forecast?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  
    if (!response.ok) {
      throw new Error(
        `Failed to fetch forecast: ${response.status} ${response.statusText}`,
      );
    }
  
    return response.json() as Promise<ForecastResponse>;
  },
  async getHealthAdvice(
    query: HealthAdviceQuery,
  ): Promise<HealthAdviceResponse> {
    const params = new URLSearchParams();
  
    if (query.locationId) {
      params.set("locationId", query.locationId);
    } else if (
      query.latitude !== undefined &&
      query.longitude !== undefined
    ) {
      params.set("latitude", String(query.latitude));
      params.set("longitude", String(query.longitude));
    } else {
      throw new Error(
        "Health advice requires either a locationId or coordinates.",
      );
    }
  
    const response = await fetch(
      `${API_BASE_URL}/health/advice?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  
    if (!response.ok) {
      throw new Error(
        `Failed to fetch health advice: ${response.status} ${response.statusText}`,
      );
    }
  
    return response.json() as Promise<HealthAdviceResponse>;
  },
};
export type Location = {
    id: string;
    source: string;
    sourceLocationId: string;
    name: string;
    city: string | null;
    region: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
    createdAt: string;
    updatedAt: string;
  };
  
  export type LocationsResponse = {
    locations: Location[];
    count: number;
    limit: number;
    offset: number;
  };
  
  export type LocationsQuery = {
    search?: string;
    limit?: number;
    offset?: number;
  };
  export type HistoryMeasurement = {
    id: string;
    locationId: string;
    measuredAt: string;
    pollutant: string;
    value: number;
    unit: string;
    source: string;
  };
  
  export type HistoryResponse = {
    value: HistoryMeasurement[];
    Count: number;
  };
  
  export type HistoryQuery = {
    from?: string;
    to?: string;
    pollutant?: "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO";
    limit?: number;
  };
  export type CoordinateAqiResponse = {
    latitude: number;
    longitude: number;
    aqi: number;
    category: string;
    dominantPollutant: string;
    measurements: AqiMeasurement[];
  };
  export type ForecastPoint = {
    timestamp: string;
    pollutant: string;
    predictedValue: number;
    unit: string;
  };
  
  export type ForecastResponse = {
    locationId: string;
    forecast: ForecastPoint[];
  };
  
  export type ForecastQuery = {
    locationId: string;
    hours?: number;
  };

  export type HealthOutdoorActivity = {
    level: "normal" | "caution" | "reduce" | "avoid";
    recommendation: string;
  };
  
  export type HealthAdviceResponse = {
    aqi: number;
    category: string;
    dominantPollutant: string;
  
    overallMessage: string;
  
    generalPublic: string[];
    sensitiveGroups: string[];
  
    outdoorActivity: HealthOutdoorActivity;
  
    precautions: string[];
  
    pollutantAdvice: {
      pollutant: string;
      message: string;
    };
  
    source: string;
    dataType: "ACTUAL" | "ESTIMATED" | "FORECAST";
    measuredAt: string;
  
    disclaimer: string;
  };
  
  export type HealthAdviceQuery = {
    locationId?: string;
    latitude?: number;
    longitude?: number;
  };

  export type DashboardAqiResponse =
  | CurrentAqiResponse
  | CoordinateAqiResponse;