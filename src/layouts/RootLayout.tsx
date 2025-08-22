// src/layouts/RootLayout.tsx
import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/features/auth/context/AuthContext";

const RootLayout = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

export default RootLayout;
