import { z } from "zod";

export const comparisonQuerySchema = z.object({
  locationIds: z
    .string()
    .min(1)
    .transform((value) => value.split(",").map((id) => id.trim()))
    .refine((ids) => ids.length >= 2, {
      message: "At least two location IDs are required",
    })
    .refine((ids) => ids.length <= 10, {
      message: "A maximum of 10 locations can be compared",
    }),
});

export type ComparisonQuery = z.infer<typeof comparisonQuerySchema>;