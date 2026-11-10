import { z } from "zod";

export const spatialHeatmapQuerySchema = z.object({
  pollutant: z
    .enum(["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"])
    .default("PM2.5"),
});

export const heatmapCellSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  value: z.number().nullable(),
  stationsUsed: z.number().int().nonnegative(),
  nearestDistanceKm: z.number().nonnegative().nullable(),
});

export const spatialHeatmapResponseSchema = z.object({
  id: z.number().int().positive(),
  pollutant: z.string(),
  unit: z.string(),
  generatedAt: z.string(),
  bounds: z.object({
    minLatitude: z.number(),
    maxLatitude: z.number(),
    minLongitude: z.number(),
    maxLongitude: z.number(),
  }),
  rows: z.number().int().min(2).max(200),
  columns: z.number().int().min(2).max(200),
  cells: z.array(heatmapCellSchema),
});

export type SpatialHeatmapQuery = z.infer<
  typeof spatialHeatmapQuerySchema
>;

export type SpatialHeatmapResponse = z.infer<
  typeof spatialHeatmapResponseSchema
>;