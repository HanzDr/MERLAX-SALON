import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Invalid Email"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    firstName: z.string().min(1, "First Name is Required"),
    middleName: z.string().min(1, "Second Name is Required"),
    lastName: z.string().min(1, "Last Name is Required"),
    email: z.string().email("Invalid Email"),
    birthdate: z.string(),
    phoneNumber: z
      .string()
      .min(7, "Phone number must be at least 7 digits")
      .max(15, "Phone number is too long")
      .regex(/^[0-9]+$/, "Phone number must contain only digits"),
    password: z.string().min(6, "Password must have at least 6 characters"),
    confirmedPassword: z
      .string()
      .min(6, "Password must have at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmedPassword, {
    path: ["confirmedPassword"], // points error to the correct field
    message: "Password does not match",
  });

export type signUpFormData = z.infer<typeof signUpSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid Email Address"),
});

export type resetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const editProfileSchema = z.object({
  firstName: z.string().min(1, "First Name is Required"),
  middleName: z.string().min(2, "Second Name is Required"),
  lastName: z.string().min(1, "Last Name is Required"),
  email: z.string().email("Invalid Email"),
});

export type editProfileFormData = z.infer<typeof editProfileSchema>;
