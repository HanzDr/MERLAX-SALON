// components/CustomerProfile.tsx
import React, { useEffect, useMemo, useState } from "react";
import useUserProfile from "@/features/auth/hooks/UseUserProfile";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { type Customer } from "@/features/auth/types/AuthTypes";

/* -------------------- helpers -------------------- */
const brand = { orange: "#FFB030" };

function labelize(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
function initials(first?: string | null, last?: string | null) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  const out = (f[0] || "") + (l[0] || "");
  return (out || "CU").toUpperCase();
}
function niceDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 5);
}

/* -------------------- component -------------------- */
const CustomerProfile = () => {
  const { user, userProfile, loading, error, updateProfile, changePassword } =
    useUserProfile();

  const [editForm, setEditForm] = useState<Customer | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userProfile) setEditForm(userProfile);
  }, [userProfile]);

  const fullName = useMemo(() => {
    const p = [
      editForm?.firstName,
      editForm?.middleName,
      editForm?.lastName,
    ].filter(Boolean);
    return p.length ? p.join(" ") : "—";
  }, [editForm]);

  const avatar = useMemo(
    () => initials(editForm?.firstName, editForm?.lastName),
    [editForm?.firstName, editForm?.lastName]
  );

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    const ok = await updateProfile(editForm as Customer);
    setSavingEdit(false);
    if (ok) {
      alert("Profile updated successfully!");
      setIsEditModalOpen(false);
    } else {
      alert("Failed to update profile.");
    }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (!user?.email) {
      setPasswordError("User email not found");
      return;
    }

    setChangingPw(true);
    const result = await changePassword(
      user.email,
      currentPassword,
      newPassword
    );
    setChangingPw(false);

    if (result.success) {
      alert("Password updated successfully");
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordError("");
    } else {
      setPasswordError(result.message || "Failed to change password");
    }
  };

  /* -------- loading/error -------- */
  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh] text-gray-600">
        <Loader2 className="animate-spin h-6 w-6 mr-2" />
        Loading your profile...
      </div>
    );

  if (error || !editForm)
    return (
      <div className="flex justify-center items-center h-[80vh] text-red-500">
        {error || "No profile found."}
      </div>
    );

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-[90vh] bg-white p-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Card */}
        <section className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
          {/* Header */}
          <div className="p-6 flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-full grid place-items-center text-white text-sm font-semibold"
              style={{ background: brand.orange }}
            >
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">
                My Profile
              </h1>
              <p className="text-sm text-gray-500">
                Manage your personal information
              </p>
            </div>
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Change Password
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-orange-300"
                style={{ background: brand.orange }}
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200" />

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Meta (minimal) */}
            <div className="text-sm text-gray-600">
              <span className="mr-4">
                <span className="text-gray-700 font-medium">Full name:</span>{" "}
                {fullName}
              </span>
              <span>
                <span className="text-gray-700 font-medium">Joined:</span>{" "}
                {niceDate(userProfile?.joined_at)}
              </span>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "firstName",
                "middleName",
                "lastName",
                "email",
                "phoneNumber",
              ].map((field) => (
                <label
                  key={field}
                  className={field === "phoneNumber" ? "sm:col-span-2" : ""}
                >
                  <span className="block text-xs font-medium text-gray-600 mb-1">
                    {labelize(field)}
                  </span>
                  <input
                    type="text"
                    value={(editForm as any)[field] ?? ""}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </label>
              ))}
            </div>

            {/* Mobile buttons */}
            <div className="sm:hidden flex gap-2 pt-2">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Change Password
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-orange-300"
                style={{ background: brand.orange }}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ===== Edit Modal (minimal) ===== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Edit Profile
              </h2>
              <div className="grid gap-4">
                {["firstName", "middleName", "lastName", "phoneNumber"].map(
                  (field) => (
                    <label key={field}>
                      <span className="block text-xs font-medium text-gray-600 mb-1">
                        {labelize(field)}
                      </span>
                      <input
                        name={field}
                        value={(editForm as any)[field] ?? ""}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </label>
                  )
                )}
                <label>
                  <span className="block text-xs font-medium text-gray-600 mb-1">
                    Email (read-only)
                  </span>
                  <input
                    value={editForm.email ?? ""}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-70"
                  style={{ background: brand.orange }}
                >
                  {savingEdit ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Password Modal (minimal) ===== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Change Password
              </h2>

              <div className="grid gap-4">
                {[
                  {
                    label: "Current Password",
                    value: passwordForm.currentPassword,
                    show: showCurrentPassword,
                    toggle: () => setShowCurrentPassword((p) => !p),
                    key: "currentPassword",
                  },
                  {
                    label: "New Password",
                    value: passwordForm.newPassword,
                    show: showNewPassword,
                    toggle: () => setShowNewPassword((p) => !p),
                    key: "newPassword",
                  },
                  {
                    label: "Confirm Password",
                    value: passwordForm.confirmPassword,
                    show: showConfirmPassword,
                    toggle: () => setShowConfirmPassword((p) => !p),
                    key: "confirmPassword",
                  },
                ].map(({ label, value, show, toggle, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={show ? "text" : "password"}
                        value={value}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <button
                        type="button"
                        onClick={toggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                        aria-label={show ? "Hide password" : "Show password"}
                      >
                        {show ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {key === "newPassword" && (
                      <PasswordStrength value={value} />
                    )}
                  </div>
                ))}

                {passwordError && (
                  <p className="text-red-500 text-sm">{passwordError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPw}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-70"
                  style={{ background: brand.orange }}
                >
                  {changingPw ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                    </span>
                  ) : (
                    "Update"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------- subcomponents -------------------- */
function PasswordStrength({ value }: { value: string }) {
  const s = scorePassword(value);
  const segments = 5;

  // minimalist meter (monochrome with slight success accent at max)
  const segmentClass = (i: number) =>
    i < s ? (s < 5 ? "bg-gray-400" : "bg-green-500") : "bg-gray-200";

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded ${segmentClass(i)}`} />
        ))}
      </div>
      <p className="text-[11px] mt-1 text-gray-500">
        Use 8+ chars with upper/lowercase, numbers, and a symbol.
      </p>
    </div>
  );
}

export default CustomerProfile;
