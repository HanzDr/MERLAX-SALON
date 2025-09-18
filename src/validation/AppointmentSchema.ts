import { z } from "zod";

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "HH:MM or HH:MM:SS");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const createAppointmentSchema = z
  .object({
    appointment_date: dateString,
    expected_start_time: timeString,
    expected_end_time: timeString,
    total_amount: z.number().nonnegative(),
    payment_method: z.enum(["Cash", "Card", "GCash"]),
    comments: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => v.expected_start_time < v.expected_end_time, {
    path: ["expected_start_time"],
    message: "Start time must be before end time",
  });

export const updateAppointmentSchema = z
  .object({
    appointment_date: dateString.optional(),
    expected_start_time: timeString.optional(),
    expected_end_time: timeString.optional(),
    start_at: z.string().datetime().nullable().optional(),
    end_at: z.string().datetime().nullable().optional(),
    total_amount: z.number().nonnegative().optional(),
    payment_method: z.enum(["Cash", "Card", "GCash"]).optional(),
    comments: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (v) =>
      !(v.expected_start_time && v.expected_end_time) ||
      v.expected_start_time < v.expected_end_time,
    { message: "Start time must be before end time" }
  );
