import { z } from "zod";

export const addProductSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  packaging: z.string().min(1, "Packaging is required."),
  initialQuantity: z.number().min(0, "Quantity cannot be negative."),
  sellingPrice: z.number().min(0, "Price must be positive."),
});

export type AddProductData = z.infer<typeof addProductSchema>;
