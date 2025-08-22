import { z } from "zod";

export const serviceSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    duration: z.coerce.number().gt(0, "Duration must be greater than 0"), // minutes
    min_price: z.coerce.number().gt(0, "Price must be greater than 0"), // allow decimals
    max_price: z.coerce.number().gt(0, "Price must be greater than 0"), // allow decimals
  })
  .refine((data) => data.min_price <= data.max_price, {
    message: "Min price must be less than or equal to max price",
    path: ["max_price"],
  });

export type serviceSchemaData = z.infer<typeof serviceSchema>;

export const stylistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phoneNumber: z.string().optional(),
  role: z.string().min(1, "Role is required"),

  services: z
    .array(z.string().uuid("Invalid service ID"))
    .min(1, "Select at least one service"),

  schedule: z.array(
    z
      .object({
        day: z.string(),
        start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      })
      .refine((s) => s.end_time > s.start_time, {
        message: "End time must be after start time",
        path: ["end_time"],
      })
  ),
});

export type stylistSchemaData = z.infer<typeof stylistSchema>;
