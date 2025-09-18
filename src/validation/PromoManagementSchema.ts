import { z } from "zod";

const status = ["Active", "Inactive"] as const;

export const packageFormSchema = z
  .object({
    name: z.string().min(1, "Package Name is Required"),
    status: z.enum(status),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    price: z.coerce.number().gt(0, "Price must be greater than 0"),
    included_services: z
      .array(z.string().uuid("Invalid service ID"))
      .min(1, "Select at least one service")
      .refine((arr) => new Set(arr).size === arr.length, {
        path: ["included_services"],
        message: "Duplicate services are not allowed",
      }),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: "End date must be greater than start date",
    path: ["end_date"],
  });

export type packageFormData = z.infer<typeof packageFormSchema>;

export const discountFormSchema = z.object({
  name: z.string().min(1, "Discount Name is Required"),
  type: z.enum(["Percentage", "Fixed Amount"]),
  value: z.coerce.number().gt(0, "Value must be greater than 0"),
  applies_to: z.enum(["Service", "Package"]),
  included_services: z
    .array(z.string().uuid("Invalid service/package ID"))
    .min(1, "Select at least one service")
    .refine((arr) => new Set(arr).size === arr.length, {
      path: ["included_services"],
      message: "Duplicate services are not allowed",
    }),
});

export type discountFormData = z.infer<typeof discountFormSchema>;
