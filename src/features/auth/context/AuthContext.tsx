import { createContext, useContext } from "react";
import useAuth from "../hooks/UseAuth";

// 1. Create the context and specify its type
const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

// 2. Create a provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // 1a. initialize the hook yo use for this provider
  const auth = useAuth();
  // 1b. return the provider tag with the value
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// 3. Create a reusable hook to safely access the AuthContext. This prevents repetitive context usage logic across components and includes error handling to ensure it's used within an AuthProvider.
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return context;
};
