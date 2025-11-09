// AdminLogin.tsx
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import adminLoginBg from "@/assets/adminLoginBg.png";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInFormData } from "@/validation/AuthSchema";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { Link } from "react-router-dom";

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { handleAdminSignIn } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (formData: SignInFormData) => {
    setAuthError(null);
    try {
      await handleAdminSignIn(formData, reset);
    } catch (err: any) {
      const message = err?.message || "Something went wrong. Please try again.";
      setAuthError(message);
    }
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* Full Background Image */}
      <img
        src={adminLoginBg}
        alt="Admin Login Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Subtle Overlay for contrast */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

      {/* Centered Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/30">
        <h1 className="text-4xl font-bold text-center tracking-tight">
          <span className="bg-gradient-to-r from-[#FFB030] to-[#FFCC6A] bg-clip-text text-transparent">
            MERLAX
          </span>
        </h1>
        <p className="text-center text-gray-600 mb-6 text-xs ">Admin Login</p>

        {/* Global Auth Error */}
        {authError && (
          <div className="text-red-600 bg-red-100 border border-red-300 p-2 rounded text-sm text-center mb-4">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="text"
              {...register("email")}
              className="w-full border-b-2 border-gray-300 p-2 outline-none bg-transparent focus:border-[#FFB030] transition"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="w-full border-b-2 border-gray-300 p-2 pr-10 outline-none bg-transparent focus:border-[#FFB030] transition"
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="text-left">
            <Link to="reset-password">
              <p className="text-sm text-blue-500 hover:underline">
                Forgot Password?
              </p>
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#FFB030] hover:bg-[#e09d29] p-2 rounded text-white font-medium transition"
          >
            Login
          </button>
        </form>
      </div>

      {/* Optional Footer Tagline */}
      <div className="absolute bottom-4 text-center text-xs text-white/70">
        © {new Date().getFullYear()} MERLAX Admin Console
      </div>
    </div>
  );
};

export default AdminLogin;
