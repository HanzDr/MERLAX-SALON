// CustomerSignUp.tsx

import { useState } from "react";
import customerLoginBg from "@/assets/customerLoginBg.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { type signUpFormData, signUpSchema } from "@/validation/AuthSchema";
import { useAuthContext } from "@/features/auth/context/AuthContext";

const CustomerSignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<signUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const { handleSignUp } = useAuthContext();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

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
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left: Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white overflow-y-auto p-4">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="w-full max-w-sm space-y-3"
        >
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-[#FFB030] font-newsreader">
              MERLAX
            </h1>
            <p className="text-gray-600 text-sm">Customer Sign Up</p>
          </div>

          {formError && (
            <p className="text-red-600 text-xs text-center font-medium">
              {formError}
            </p>
          )}

          {/* First Name */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-xs font-medium mb-1"
            >
              First Name
            </label>
            <input
              {...register("firstName")}
              type="text"
              id="firstName"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.firstName.message}
              </p>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <label
              htmlFor="middleName"
              className="block text-xs font-medium mb-1"
            >
              Middle Name
            </label>
            <input
              {...register("middleName")}
              type="text"
              id="middleName"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.middleName && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.middleName.message}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-xs font-medium mb-1"
            >
              Last Name
            </label>
            <input
              {...register("lastName")}
              type="text"
              id="lastName"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.lastName.message}
              </p>
            )}
          </div>

          {/* Birthdate */}
          <div>
            <label
              htmlFor="birthdate"
              className="block text-xs font-medium mb-1"
            >
              Birthdate
            </label>
            <input
              {...register("birthdate")}
              type="date"
              id="birthdate"
              max={today}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.birthdate && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.birthdate.message}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-xs font-medium mb-1"
            >
              Phone Number
            </label>
            <input
              {...register("phoneNumber")}
              type="tel"
              id="phoneNumber"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.phoneNumber && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium mb-1">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              id="email"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs pr-10 appearance-none"
              />
              <div
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 cursor-pointer"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium mb-1"
            >
              Confirm Password
            </label>
            <input
              {...register("confirmedPassword")}
              type="password"
              id="confirmPassword"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
            {errors.confirmedPassword && (
              <p className="text-red-500 text-xs mt-0.5">
                {errors.confirmedPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#FFB030] hover:bg-[#e09d29] text-white font-semibold py-1.5 rounded text-xs"
          >
            Join the Style Club
          </button>
        </form>
      </div>

      {/* Right: Image */}
      <div className="hidden md:block md:w-1/2">
        <img
          src={customerLoginBg}
          alt="Sign up visual"
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  );
};

export default CustomerSignUp;
