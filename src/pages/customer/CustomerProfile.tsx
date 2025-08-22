// components/CustomerProfile.tsx

import React, { useEffect, useState } from "react";
import useUserProfile from "@/features/auth/hooks/UseUserProfile";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { type Customer } from "@/features/auth/types/AuthTypes";

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

  useEffect(() => {
    if (userProfile) setEditForm(userProfile);
  }, [userProfile]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    const success = await updateProfile(editForm as Customer);
    if (success) {
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

    const result = await changePassword(
      user.email,
      currentPassword,
      newPassword
    );

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

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // This is where the loading state is used when its true it will return this instead of the entire GUI
  if (loading) return <p>Loading...</p>;
  if (error || !editForm) return <p>{error || "No profile found."}</p>;

  return (
    <div
      style={{
        background: "#fff",
        height: "90vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          padding: "2rem",
          background: "#F1F1F1",
          borderRadius: "8px",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "500" }}>My Profile</h1>
        <p style={{ marginBottom: "2rem", color: "#666" }}>
          Manage your personal information
        </p>

        <form style={{ display: "grid", gap: "1rem" }}>
          {["firstName", "middleName", "lastName", "email", "phoneNumber"].map(
            (field) => (
              <div key={field}>
                <label>
                  {
                    field
                      .replace(/([A-Z])/g, " $1") // insert space before capital letters
                      .replace(/^./, (str) => str.toUpperCase()) // capitalize first letter of the string
                      .replace(/\b\w/g, (str) => str.toUpperCase()) // capitalize first letter of each word
                  }
                </label>

                <input
                  type="text"
                  value={(editForm as any)[field]}
                  readOnly
                  style={inputStyle}
                />
              </div>
            )
          )}
          <p>
            Joined At:{" "}
            {userProfile?.joined_at
              ? new Date(userProfile.joined_at).toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              style={goldButton}
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              style={darkButton}
            >
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2>Edit Profile</h2>
            <form style={{ display: "grid", gap: "1rem" }}>
              {["firstName", "middleName", "lastName", "phoneNumber"].map(
                (field) => (
                  <div key={field}>
                    <label>
                      {
                        field
                          .replace(/([A-Z])/g, " $1") // insert space before capital letters
                          .replace(/^./, (str) => str.toUpperCase()) // capitalize first letter of the string
                          .replace(/\b\w/g, (str) => str.toUpperCase()) // capitalize first letter of each word
                      }
                    </label>
                    <input
                      name={field}
                      value={(editForm as any)[field]}
                      onChange={handleEditChange}
                      style={inputStyle}
                    />
                  </div>
                )
              )}
              <div>
                <label>Email (read-only)</label>
                <input
                  type="text"
                  value={editForm.email}
                  readOnly
                  style={{ ...inputStyle, background: "#eaeaea" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  style={greenButton}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2>Change Password</h2>
            <form style={{ display: "grid", gap: "1rem" }}>
              {[
                {
                  label: "Current Password",
                  value: passwordForm.currentPassword,
                  show: showCurrentPassword,
                  toggle: () => setShowCurrentPassword((prev) => !prev),
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    })),
                },
                {
                  label: "New Password",
                  value: passwordForm.newPassword,
                  show: showNewPassword,
                  toggle: () => setShowNewPassword((prev) => !prev),
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    })),
                },
                {
                  label: "Confirm Password",
                  value: passwordForm.confirmPassword,
                  show: showConfirmPassword,
                  toggle: () => setShowConfirmPassword((prev) => !prev),
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    })),
                },
              ].map(({ label, value, show, toggle, onChange }) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1">
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={value}
                      onChange={onChange}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs pr-10 appearance-none"
                    />
                    <div
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 cursor-pointer"
                      onClick={toggle}
                    >
                      {show ? <FaEyeSlash /> : <FaEye />}
                    </div>
                  </div>
                </div>
              ))}

              {passwordError && (
                <p className="text-red-500 text-xs mt-1">{passwordError}</p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  style={greenButton}
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  style={cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// === Styles ===
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  height: "100vh",
  width: "100vw",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalContent: React.CSSProperties = {
  background: "#fff",
  padding: "2rem",
  borderRadius: "8px",
  width: "90%",
  maxWidth: "400px",
};

const goldButton: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#FFB030",
  border: "none",
  color: "#fff",
  borderRadius: "4px",
  cursor: "pointer",
};

const darkButton: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#333",
  border: "none",
  color: "#fff",
  borderRadius: "4px",
  cursor: "pointer",
};

const greenButton: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#28a745",
  border: "none",
  color: "#fff",
  borderRadius: "4px",
  cursor: "pointer",
};

const cancelButton: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#ccc",
  color: "#333",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default CustomerProfile;
