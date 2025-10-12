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
    setAuthError(null); // reset previous error
    try {
      await handleAdminSignIn(formData, reset);
    } catch (err: any) {
      const message = err?.message || "Something went wrong. Please try again.";
      setAuthError(message);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Side - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white px-4 sm:px-8 py-10">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-xs sm:max-w-sm bg-white p-6 sm:p-8 space-y-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-[#FFB030] text-center font-newsreader">
            MERLAX
          </h1>
          <p className="text-center text-gray-600">Admin Login</p>

          {/* Global Auth Error */}
          {authError && (
            <div className="text-red-600 bg-red-100 border border-red-300 p-2 rounded text-sm text-center">
              {authError}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="text"
              {...register("email")}
              className="border-b-2 border-gray-300 w-full p-2 outline-none focus:ring-0 focus:border-[#FFB030]"
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
              className="block mb-1 text-sm font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="border-b-2 border-gray-300 w-full p-2 pr-10 outline-none focus:ring-0 focus:border-[#FFB030]"
              />
              <div
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 cursor-pointer"
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
            className="w-full bg-[#FFB030] hover:bg-[#e09d29] p-2 rounded text-white font-medium"
          >
            Login
          </button>
        </form>
      </div>

      {/* Right Side - Image */}
      <div className="hidden md:block w-1/2 h-full">
        <img
          src={adminLoginBg}
          alt="Admin Login"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default AdminLogin;
