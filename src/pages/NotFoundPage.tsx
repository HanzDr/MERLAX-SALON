import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseclient";
import { FaExclamationTriangle } from "react-icons/fa";

const NotFoundPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      // Delay so the user sees the 404 briefly
      setTimeout(() => {
        if (!user || error) {
          navigate("/customer/login"); // 🚫 Not logged in
        } else {
          const role = user.user_metadata?.role;

          if (role === "admin") {
            navigate("/admin/appointments"); // ✅ Admin
          } else {
            navigate("/customer/appointments"); // ✅ Customer or default
          }
        }
      }, 2000);
    };

    redirectUser();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="text-center">
        <FaExclamationTriangle className="text-yellow-500 text-6xl mb-4 mx-auto" />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          404 - Page Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <p className="text-sm text-gray-500 italic">
          Redirecting you shortly...
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
