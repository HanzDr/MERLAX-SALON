import usePromoManagement from "../hooks/usePromoManagement";
import { createContext, useContext } from "react";

export const PromoManagementContext = createContext<ReturnType<
  typeof usePromoManagement
> | null>(null);

export const PromoManagementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const promoManagement = usePromoManagement();

  return (
    <PromoManagementContext.Provider value={promoManagement}>
      {children}
    </PromoManagementContext.Provider>
  );
};

export const usePromoManagementContext = () => {
  const context = useContext(PromoManagementContext);
  if (!context) {
    throw new Error(
      "usePromoManagement must be used inside PromoManagementProvider"
    );
  }
  return context;
};
