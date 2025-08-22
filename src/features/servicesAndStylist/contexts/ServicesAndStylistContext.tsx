import React from "react";
import { useContext, createContext } from "react";
import useServicesAndStylist from "../hooks/useServicesAndStylist";

const ServicesAndStylistContext = createContext<ReturnType<
  typeof useServicesAndStylist
> | null>(null);

export const ServicesAndStylistProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const ServicesAndStylist = useServicesAndStylist();

  return (
    <ServicesAndStylistContext.Provider value={ServicesAndStylist}>
      {children}
    </ServicesAndStylistContext.Provider>
  );
};

export const useServicesAndStylistContext = () => {
  const context = useContext(ServicesAndStylistContext);
  if (!context) {
    throw new Error(
      "useServicesAndStylist must be used inside ServicesAndStylistProvider"
    );
  }
  return context;
};
