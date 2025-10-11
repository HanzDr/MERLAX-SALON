import { createContext, useContext } from "react";
import useFeedback from "../hooks/useFeedback";

export const FeedbackContext = createContext<ReturnType<
  typeof useFeedback
> | null>(null);

export const FeedbackProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const feedback = useFeedback();

  return (
    <FeedbackContext.Provider value={feedback}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedbackContext = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedbackContext must be used inside FeedbackProvider");
  }
  return context;
};
