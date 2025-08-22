import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseclient";
import { type Customer } from "@/features/auth/types/AuthTypes";
import { type Packages } from "@/features/promo-management/types/PromoManagementTypes";
const usePagination = () => {
  const [paginatedCustomers, setPaginatedCustomers] =
    useState<Array<Customer> | null>(null);
  const [paginatedPackages, setPaginatedPackages] =
    useState<Array<Packages> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // PaginationContext.tsx (or wherever your provider is)
  const fetchPaginatedCustomers = useCallback(
    async (
      startingIndex: number,
      endingIndex: number
    ): Promise<{ data: Customer[]; error: unknown | null }> => {
      setLoading(true);

      // guard against negatives & ensure from <= to
      const from = Math.max(0, startingIndex);
      const to = Math.max(from, endingIndex);

      try {
        const { data, error } = await supabase
          .from("Customers")
          .select("*")
          .order("joined_at", { ascending: false }) // or use created_at if you have it
          .range(from, to); // ✅ no -1

        if (error) throw error;

        const rows = data ?? [];
        setPaginatedCustomers(rows);
        return { data: rows, error: null };
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setPaginatedCustomers([]);
        return { data: [], error: err };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchPaginatedPackages = async (
    startingIndex: number,
    endingIndex: number
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Packages")
        .select("*")
        .order("joined_at", { ascending: false })
        .range(startingIndex, endingIndex);

      if (error) throw error; // ensure error is caught

      setPaginatedPackages(data); // prevent null in state

      return { data, error: null };
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch Packages:", err);
      return { data: null, error: err };
    }
  };
  return {
    paginatedCustomers,
    paginatedPackages,
    loading,
    fetchPaginatedCustomers,
    fetchPaginatedPackages,
  };
};

export default usePagination;
