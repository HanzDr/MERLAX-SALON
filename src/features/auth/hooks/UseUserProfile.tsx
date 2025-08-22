import { useEffect, useState } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabaseclient";
import { type Customer } from "../types/AuthTypes";

const useUserProfile = () => {
  const [user, setUser] = useState<any>(null); // State used to fetch the user via getUser API
  const [userProfile, setUserProfile] = useState<Customer | null>(null); // This state is where we store the data after querying using the user.id
  const [loading, setLoading] = useState(true); // This is just loading state to not show the entire GUI immediately, only shows after the fetchUserProfile is completely successful
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // 1. Set the states like loading to not automatically show any GUI if the data is not successfully fetched yet
      setLoading(true);
      setError(null);

      // 2. Fetch the user and set it to the state we've initialize "user"
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // 3. Check for errors
      if (authError || !user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      // 4. Save user in the state "user"
      setUser(user); // ✅ Save the user here

      // 5. Fetch data using the customer_id of the user we just fetched
      const { data, error: fetchError } = await supabase
        .from("Customers")
        .select("*")
        .eq("customer_id", user.id)
        .maybeSingle();

      // 6. Check for errors
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setUserProfile(data);
      }

      // 7. Set loading state to false at the end.
      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  const updateProfile = async (updatedData: Partial<Customer>) => {
    if (!userProfile) return false;

    const { error: updateError } = await supabase
      .from("Customers")
      .update(updatedData)
      .eq("customer_id", userProfile.customer_id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setUserProfile({ ...userProfile, ...updatedData });
    return true;
  };

  const changePassword = async (
    email: string,
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (loginError) {
        return { success: false, message: "Incorrect current password" };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, message: updateError.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Something went wrong" };
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    updateProfile,
    changePassword,
  };
};

export async function setCustomerBlocked(
  customerId: string,
  authUserId: string,
  blocked: boolean
) {
  // (Optional) Mirror to your Customers table for UI
  const { error: mirrorErr } = await supabase
    .from("Customers")
    .update({ is_blocked: blocked })
    .eq("customer_id", customerId);
  if (mirrorErr) throw mirrorErr;

  // Auth-level ban/unban (prevents future logins)
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    blocked ? { ban_duration: "876000h" } : { ban_duration: "none" }
  );
  if (authErr) throw authErr;

  return { ok: true };
}

export default useUserProfile;
