// CustomerSignUp.tsx

import { useState } from "react";
import customerLoginBg from "@/assets/customerLoginBg.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type signUpFormData, signUpSchema } from "@/validation/AuthSchema";
import { useAuthContext } from "@/features/auth/context/AuthContext";

console.log("SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);

const inputBase =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm " +
  "outline-none ring-0 transition placeholder:text-gray-400 " +
  "focus:border-[#FFB030] focus:ring-2 focus:ring-[#FFB030]/30 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const labelBase = "block text-xs font-medium text-gray-700 mb-1";

const errorText = "text-red-500 text-xs mt-1";

const CustomerSignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<signUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
  });

  const { handleSignUp } = useAuthContext();
  const today = new Date().toISOString().split("T")[0];

  const onSubmit = async (formData: signUpFormData) => {
    const result = await handleSignUp(formData, reset);

    if (!result.success) {
      if (result.field) {
        setError(result.field as keyof signUpFormData, {
          type: "manual",
          message: result.message,
        });
      } else {
        setFormError(result.message || "An error occurred.");
      }
    } else {
      setFormError(null);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#FFB030] to-[#FFCC6A] bg-clip-text text-transparent">
                MERLAX
              </span>
            </h1>
            <p className="text-gray-500 text-sm">
              Create your customer account
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              {/* Name group */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="firstName" className={labelBase}>
                    First Name
                  </label>
                  <input
                    {...register("firstName")}
                    type="text"
                    id="firstName"
                    className={inputBase}
                    autoComplete="given-name"
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && (
                    <p className={errorText}>{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="middleName" className={labelBase}>
                    Middle Name
                  </label>
                  <input
                    {...register("middleName")}
                    type="text"
                    id="middleName"
                    className={inputBase}
                    autoComplete="additional-name"
                    aria-invalid={!!errors.middleName}
                  />
                  {errors.middleName && (
                    <p className={errorText}>{errors.middleName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className={labelBase}>
                    Last Name
                  </label>
                  <input
                    {...register("lastName")}
                    type="text"
                    id="lastName"
                    className={inputBase}
                    autoComplete="family-name"
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && (
                    <p className={errorText}>{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Birthdate */}
              <div>
                <label htmlFor="birthdate" className={labelBase}>
                  Birthdate
                </label>
                <input
                  {...register("birthdate")}
                  type="date"
                  id="birthdate"
                  max={today}
                  className={inputBase}
                  aria-invalid={!!errors.birthdate}
                />
                {errors.birthdate && (
                  <p className={errorText}>{errors.birthdate.message}</p>
                )}
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="phoneNumber" className={labelBase}>
                    Phone Number
                  </label>
                  <input
                    {...register("phoneNumber")}
                    type="tel"
                    id="phoneNumber"
                    inputMode="tel"
                    placeholder="09xx xxx xxxx"
                    className={inputBase}
                    autoComplete="tel"
                    aria-invalid={!!errors.phoneNumber}
                  />
                  {errors.phoneNumber && (
                    <p className={errorText}>{errors.phoneNumber.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className={labelBase}>
                    Email
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    id="email"
                    className={inputBase}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className={errorText}>{errors.email.message}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelBase}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    id="password"
                    className={`${inputBase} pr-10`}
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FFB030]/40"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && (
                  <p className={errorText}>{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className={labelBase}>
                  Confirm Password
                </label>
                <input
                  {...register("confirmedPassword")}
                  type="password"
                  id="confirmPassword"
                  className={inputBase}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmedPassword}
                />
                {errors.confirmedPassword && (
                  <p className={errorText}>
                    {errors.confirmedPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#FFB030] px-4 py-2 text-sm font-semibold text-white transition 
                           hover:bg-[#EFA53A] focus:outline-none focus:ring-2 focus:ring-[#FFB030]/40
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Creating your account…"
                  : "Join the Style Club"}
              </button>

              {/* Tiny footnote */}
              <p className="text-[11px] text-gray-500 text-center">
                By continuing, you agree to our{" "}
                <a
                  className="underline decoration-dotted hover:text-gray-700"
                  href="#"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  className="underline decoration-dotted hover:text-gray-700"
                  href="#"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Right: Visual panel */}
      <div className="hidden md:block relative">
        <img
          src={customerLoginBg}
          alt="Sign up visual"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Soft overlay + brand tag */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/40" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 backdrop-blur text-white">
            <span className="h-2 w-2 rounded-full bg-[#FFB030]" />
            <span className="text-xs tracking-wide">
              Customer Experience, Elevated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSignUp;
