import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/lib/supabaseclient";
import type { SignInFormData, signUpFormData } from "@/validation/AuthSchema";
import type { User } from "@supabase/supabase-js";

type Role = "admin" | "customer";

const extractRole = (user: User | null): Role | null =>
  (user?.user_metadata?.role as Role) ?? null;

/** Map auth.user -> Customers row */
function mapUserToCustomerRow(user: User) {
  const m = user.user_metadata ?? {};
  return {
    customer_id: user.id,
    email: user.email,
    firstName: m.firstName ?? null,
    middleName: m.middleName ?? null,
    lastName: m.lastName ?? null,
    birthdate: m.birthdate ?? null,
    phoneNumber: m.phoneNumber ?? null,
    role: m.role ?? "customer",
  };
}

/** Ensure a Customers row exists for this user (idempotent) */
async function ensureCustomerProfile(user: User) {
  const row = mapUserToCustomerRow(user);
  // If you have a unique/PK on customer_id, this will dedupe
  const { error } = await supabase
    .from("Customers")
    .upsert(row, { onConflict: "customer_id" }); // uses PK/unique to avoid duplicates
  if (error) throw new Error(`Customers upsert failed: ${error.message}`);
}

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) throw new Error("Invalid email or password.");
    if (!data?.user) throw new Error("Account not found.");

    const userRole = extractRole(data.user);
    if (userRole !== expectedRole) {
      await supabase.auth.signOut();
      throw new Error("Unauthorized access.");
    }

    // Optional: ensure profile exists on first sign-in too
    await ensureCustomerProfile(data.user);

    navigate(redirectPath);
    reset();
  };

  const handleCustomerSignIn = async (
    formData: SignInFormData,
    reset: () => void
  ) => baseSignIn(formData, "customer", "/customer/appointments", reset);

  const handleAdminSignIn = async (
    formData: SignInFormData,
    reset: () => void
  ) => baseSignIn(formData, "admin", "/admin/analytics", reset);

  const handleSignUp = async (
    formData: signUpFormData,
    reset: () => void
  ): Promise<{ success: boolean; message?: string; field?: string }> => {
    // 1) Try normal sign-up (works when ENABLE_EMAIL_AUTOCONFIRM=true)
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        // not used if you auto-confirm, but harmless to keep
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

    // 2) If GoTrue fails (e.g., SMTP 500), fallback to Admin API locally
    let newUser: User | null = data?.user ?? null;

    if (error || !newUser) {
      const isLocal =
        import.meta.env.DEV ||
        /127\.0\.0\.1|localhost/.test(import.meta.env.VITE_SUPABASE_URL ?? "");

      if (!isLocal) {
        // production: surface error
        if (error?.message?.toLowerCase().includes("already registered")) {
          return {
            success: false,
            message: "This email is already taken.",
            field: "email",
          };
        }
        return { success: false, message: error?.message || "Sign-up failed." };
      }

      // Local dev: create via Admin (email_confirm skips SMTP)
      const { data: adminData, error: adminErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            email: formData.email,
            firstName: formData.firstName,
            middleName: formData.middleName,
            lastName: formData.lastName,
            birthdate: new Date(formData.birthdate).toISOString().split("T")[0],
            phoneNumber: formData.phoneNumber,
            role: "customer",
          },
        });
      if (adminErr) {
        if (adminErr.message?.toLowerCase().includes("already registered")) {
          return {
            success: false,
            message: "This email is already taken.",
            field: "email",
          };
        }
        return {
          success: false,
          message: adminErr.message || "Sign-up failed.",
        };
      }
      // admin.createUser returns a User object
      newUser = adminData.user ?? null;

      // Optionally sign them in for a seamless flow
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
    }

    if (!newUser) {
      return { success: false, message: "Sign-up failed: No user returned." };
    }

    // 3) Create/Upsert Customers row immediately
    await ensureCustomerProfile(newUser);

    // 4) Navigate + reset
    reset();
    navigate("/customer/login");
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
