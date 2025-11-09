import { createContext } from "react";
import useAnalytics from "../hooks/useAnalytics";

export const AnalyticsContext = createContext<ReturnType<
  typeof useAnalytics
> | null>(null);

export const AnalyticsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const analytics = useAnalytics();
  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
};
