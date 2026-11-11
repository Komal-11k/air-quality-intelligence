import { z } from "zod";

export const assistantQuerySchema = z.object({
  question: z.string().trim().min(1).max(1000),

  currentPage: z.string().trim().min(1).max(200).optional(),

  locationId: z.string().uuid().optional(),

  latitude: z.coerce.number().min(-90).max(90).optional(),

  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type AssistantQuery = z.infer<typeof assistantQuerySchema>;

export const assistantResponseSchema = z.object({
  answer: z.string(),

  sources: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
    }),
  ),
});

export type AssistantResponse = z.infer<typeof assistantResponseSchema>;