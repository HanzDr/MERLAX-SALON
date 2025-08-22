import usePagination from "@/public-hooks/usePagination";
import { createContext, useContext } from "react";

const paginationContext = createContext<ReturnType<
  typeof usePagination
> | null>(null);

export const PaginationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pagination = usePagination();

  return (
    <paginationContext.Provider value={pagination}>
      {children}
    </paginationContext.Provider>
  );
};

export const usePaginationContext = () => {
  const context = useContext(paginationContext);
  if (!context) {
    throw new Error("use Pagination Context inside the provider");
  }

  return context;
};
