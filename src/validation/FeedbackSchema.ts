import { z } from "zod";

export const feedbackFormSchema = z.object({
  rating: z.coerce.number().gt(0, "Value must be greater than 0"),
  comment: z.string().max(1000).nullable().optional(),
});

export type feedbackFormData = z.infer<typeof feedbackFormSchema>;
