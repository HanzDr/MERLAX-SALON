import { z } from "zod";

export const feedbackSchema = z.object({
  rating: z.coerce.number().gt(0, "Value must be greater than 0"),
  comment: z.string().max(1000).nullable().optional(),
});

export type feedbackFormData = z.infer<typeof feedbackSchema>;

export const feedbackCategorizeSchema = z.object({
  category: z.enum(["Positive", "Negative", "Neutral", "Suggestion"]),
});

export type feedbackCategorizeData = z.infer<typeof feedbackCategorizeSchema>;

export const feedbackResponseSchema = z.object({
  comment: z.string().max(500).nullable().optional(),
});

export type feedbackResponseData = z.infer<typeof feedbackResponseSchema>;
