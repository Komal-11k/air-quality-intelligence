import { z } from "zod";

export const historyQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  pollutant: z
    .enum(["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"])
    .optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;