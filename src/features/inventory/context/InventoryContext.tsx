import { createContext, useContext } from "react";
import useInventory from "../hooks/useInventory";

export const InventoryContext = createContext<ReturnType<
  typeof useInventory
> | null>(null);

export const InventoryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const inventory = useInventory();
  return (
    <InventoryContext.Provider value={inventory}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error(
      "useInventoryContext must be used inside InventoryProvider"
    );
  }

  return context;
};
