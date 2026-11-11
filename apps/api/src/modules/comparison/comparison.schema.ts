import { z } from "zod";

const uuidSchema = z.uuid();

export const comparisonQuerySchema = z.object({
  locationIds: z
    .string()
    .min(1, "Location IDs are required")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .refine((ids) => ids.length >= 2, {
      message: "At least two locations are required",
    })
    .refine((ids) => ids.length <= 5, {
      message: "A maximum of 5 locations can be compared",
    })
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplicate location IDs are not allowed",
    })
    .refine(
      (ids) => ids.every((id) => uuidSchema.safeParse(id).success),
      {
        message: "All location IDs must be valid UUIDs",
      },
    ),
});

export type ComparisonQuery = z.infer<typeof comparisonQuerySchema>;