import { Outlet } from "react-router-dom";
import AdminSidebar from "@/public-components/AdminSidebar";
import { AuthProvider } from "@/features/auth/context/AuthContext";

const AdminLayout = () => {
  return (
    <div>
      <AuthProvider>
        <AdminSidebar />
        <Outlet />
      </AuthProvider>
    </div>
  );
};

export default AdminLayout;
