import { useState } from "react";
import { FaLock } from "react-icons/fa";
import { supabase } from "@/lib/supabaseclient";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null);
    setErr(null);

    try {
      setLoading(true);

      // In Vite, use import.meta.env and a VITE_* var (optional).
      const fromEnv = (import.meta as any)?.env?.VITE_SITE_URL as
        | string
        | undefined;

      // Fallback to current origin in dev
      const origin = (fromEnv || window.location.origin).replace(/\/$/, "");
      const redirectTo = `${origin}/update-password`; // matches your AppRoutes

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;

      setOk(
        "If an account exists for that email, a reset link has been sent. Please check your inbox."
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md space-y-6">
        <div className="flex flex-col items-center">
          <FaLock className="text-4xl text-[#FFB030]" />
          <h1 className="text-2xl font-bold text-[#FFB030] mt-2 font-newsreader">
            MERLAX
          </h1>
          <p className="text-gray-600 text-sm mt-1">Reset Password</p>
        </div>

        {ok && (
          <div className="rounded-lg bg-emerald-50 text-emerald-700 text-sm p-3">
            {ok}
          </div>
        )}
        {err && (
          <div className="rounded-lg bg-rose-50 text-rose-700 text-sm p-3">
            {err}
          </div>
        )}

        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dhoregalado@addu.edu.ph"
              className="w-full border-2 border-gray-300 rounded-lg p-2 outline-none focus:border-[#FFB030]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFB030] hover:bg-[#e09d29] p-2 rounded text-white font-medium disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
