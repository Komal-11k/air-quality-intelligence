import { z } from "zod";

export const createLocationSchema = z.object({
  source: z.string().min(1),
  sourceLocationId: z.string().min(1),
  name: z.string().min(1),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const locationsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type LocationsQuery = z.infer<typeof locationsQuerySchema>;