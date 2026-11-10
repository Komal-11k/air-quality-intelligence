export interface SpatialStation {
    id: string;
    latitude: number;
    longitude: number;
    value: number;
    pollutant: string;
    unit: string;
  }
  
  export interface IDWOptions {
    power?: number;
    maxDistanceKm?: number;
    minStations?: number;
  }
  
  export interface IDWResult {
    value: number;
    stationsUsed: number;
    nearestDistanceKm: number;
  }