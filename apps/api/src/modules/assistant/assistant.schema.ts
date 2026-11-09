import { z } from "zod";

export const assistantQuerySchema = z.object({
  question: z.string().min(1).max(1000),
  locationId: z.string().uuid().optional(),
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