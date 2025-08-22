import { useEffect } from "react";
import { supabase } from "@/lib/supabaseclient";
import { useNavigate } from "react-router-dom";
// This is for when the user clicks the email account verification it then saves the meta data from supabase's users table into the customers table.
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const user = session.user;

          // Insert into customers
          const { error } = await supabase.from("Customers").insert([
            {
              customer_id: user.id,
              email: user.email,
              firstName: user.user_metadata.firstName,
              middleName: user.user_metadata.middleName,
              lastName: user.user_metadata.lastName,
              birthdate: user.user_metadata.birthdate,
              phoneNumber: user.user_metadata.phoneNumber,
              role: user.user_metadata.role,
            },
          ]);
          console.log("user_metadata:", user.user_metadata);

          if (error) {
            console.error("Insert failed:", error.message);
          } else {
            console.log("✅ Customer profile created.");
          }

          navigate("/customer/CustomerAppointments"); // or wherever
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <p>Redirecting...</p>;
};

export default AuthCallback;
