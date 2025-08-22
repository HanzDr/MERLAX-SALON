// src/components/RoleProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/features/auth/context/AuthContext";

const RoleProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { user, role, loading } = useAuthContext();

  if (loading) return <p>Loading...</p>;
  if (!user || !allowedRoles.includes(role || "")) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
