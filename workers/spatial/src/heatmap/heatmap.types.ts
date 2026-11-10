import type { SpatialStation } from "../idw/idw.types.js";

export interface HeatmapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export interface HeatmapGridOptions {
  rows: number;
  columns: number;
  idwPower?: number;
  maxDistanceKm?: number;
  minStations?: number;
}

export interface HeatmapCell {
  latitude: number;
  longitude: number;
  value: number | null;
  stationsUsed: number;
  nearestDistanceKm: number | null;
}

export interface HeatmapResult {
  pollutant: string;
  unit: string;
  bounds: HeatmapBounds;
  rows: number;
  columns: number;
  cells: HeatmapCell[];
}

export interface HeatmapInput {
  pollutant: string;
  unit: string;
  stations: SpatialStation[];
  bounds: HeatmapBounds;
  options: HeatmapGridOptions;
}