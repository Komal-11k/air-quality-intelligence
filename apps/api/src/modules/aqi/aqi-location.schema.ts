import { z } from "zod";

export const coordinateAqiQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export type CoordinateAqiQuery = z.infer<
  typeof coordinateAqiQuerySchema
>;