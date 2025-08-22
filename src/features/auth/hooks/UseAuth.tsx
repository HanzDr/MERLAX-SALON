// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseclient";
import type { SignInFormData, signUpFormData } from "@/validation/AuthSchema";
import type { User } from "@supabase/supabase-js";

type Role = "admin" | "customer";

const extractRole = (user: User | null): Role | null =>
  (user?.user_metadata?.role as Role) ?? null;

const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setRole(extractRole(sessionUser));
      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        setRole(extractRole(sessionUser));
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const baseSignIn = async (
    formData: SignInFormData,
    expectedRole: Role,
    redirectPath: string,
    reset: () => void
  ) => {
    // 1. Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    // 2. Catch if there are any errors
    if (error) {
      throw new Error("Invalid email or password.");
    }

    if (!data?.user) {
      throw new Error("Account not found.");
    }
    // 3.
    const userRole = extractRole(data.user);

    if (userRole !== expectedRole) {
      await supabase.auth.signOut();
      throw new Error("Unauthorized access.");
    }

    navigate(redirectPath);
    reset();
  };

  const handleCustomerSignIn = async (
    formData: SignInFormData,
    reset: () => void
  ) => {
    return baseSignIn(formData, "customer", "/customer/appointments", reset);
  };

  const handleAdminSignIn = async (
    formData: SignInFormData,
    reset: () => void
  ) => {
    return baseSignIn(formData, "admin", "/admin/appointments", reset);
  };

  const handleSignUp = async (
    formData: signUpFormData,
    reset: () => void
  ): Promise<{ success: boolean; message?: string; field?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: "http://localhost:5173/auth/callback",
        data: {
          email: formData.email,
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          birthdate: new Date(formData.birthdate).toISOString().split("T")[0],
          phoneNumber: formData.phoneNumber,
          role: "customer",
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return {
          success: false,
          message: "This email is already taken.",
          field: "email",
        };
      }
      return {
        success: false,
        message: error.message || "An error occurred during sign up.",
      };
    }

    if (!data?.user) {
      return {
        success: false,
        message: "Sign-up failed: No user returned.",
      };
    }

    navigate("/customer/login");
    reset();
    return { success: true };
  };

  const signOut = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const role = session?.user?.user_metadata?.role;

    if (role === "admin") {
      navigate("/admin/login");
    } else {
      navigate("/customer/login");
    }

    await supabase.auth.signOut();
  };

  return {
    user,
    role,
    loading,
    handleCustomerSignIn,
    handleAdminSignIn,
    handleSignUp,
    signOut,
  };
};

export default useAuth;
