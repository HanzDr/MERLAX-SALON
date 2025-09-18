import useAppointments from "../hooks/useAppointments";
import { createContext, useContext } from "react";

const AppointmentContext = createContext<ReturnType<
  typeof useAppointments
> | null>(null);

export const AppointmentProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const appointment = useAppointments();
  return (
    <AppointmentContext.Provider value={appointment}>
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointmentContext = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error(
      "useAppointmnetContext must be used inside AppointmnetProvider"
    );
  }

  return context;
};
