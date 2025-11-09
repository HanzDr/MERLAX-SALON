import { useState } from "react";
import { FaLock } from "react-icons/fa";
import { supabase } from "@/lib/supabaseclient";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null);
    setErr(null);

    if (password.length < 5) {
      setErr("Password must be at least 5 characters long.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk(
        "Password updated successfully. You can now sign in with your new password."
      );
      setPassword("");
      setConfirm("");
    } catch (e: any) {
      setErr(e?.message || "Failed to update password.");
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
          <p className="text-gray-600 text-sm mt-1">Set a New Password</p>
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
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border-2 border-gray-300 rounded-lg p-2 outline-none focus:border-[#FFB030]"
              required
              minLength={6}
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full border-2 border-gray-300 rounded-lg p-2 outline-none focus:border-[#FFB030]"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFB030] hover:bg-[#e09d29] p-2 rounded text-white font-medium disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
