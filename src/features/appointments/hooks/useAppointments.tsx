import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseclient";

/** --------- Types from your schema (simplified to what we need) --------- */

export type Stylist = {
  stylist_id: string;
  name?: string; // adjust if your column is different (first_name/last_name etc.)
};

export type StylistSchedule = {
  stylistSchedule_id: string;
  stylist_id: string;
  day_of_week: number; // 0=Sun ... 6=Sat
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
};

export type Service = {
  service_id: string;
  name: string;
  duration: number; // minutes
  min_price?: number | null;
  max_price?: number | null;
  display?: boolean | null;
};

export type PackageRow = {
  package_id: string;
  name?: string;
  price: number;
  status: "Active" | "Inactive";
  start_date?: string | null;
  end_date?: string | null;
  expected_duration: number; // minutes
  display?: boolean | null;
};

export type StylistServiceLink = {
  stylistServices_id: string;
  stylist_id: string;
  service_id: string;
};

export type PackageServiceLink = {
  packageServices_id: string;
  service_id: string;
  package_id: string;
};

export type DiscountRow = {
  discount_id: string;
  name: string;
  type: "Fixed" | "Percentage";
  value: number;
  applies_to: "Service" | "Package";
  start_date?: string | null;
  end_date?: string | null;
  amount_of_uses?: number | null;
  status: "Active" | "Inactive";
  display?: boolean | null; // if you added this in your Discounts table
};

/** The unified "plan" the user can pick: either a service or a package */
export type PlanOption =
  | {
      kind: "service";
      id: string; // service_id
      name: string;
      duration: number; // minutes
    }
  | {
      kind: "package";
      id: string; // package_id
      name: string;
      duration: number; // minutes (from expected_duration)
    };

/** Time-slot item returned by the hook (for pills) */
export type TimeSlot = {
  startISO: string; // 2025-02-20T08:00:00.000Z (local date applied)
  endISO: string;
  label: string; // "8:00 AM - 11:00 AM"
};

/** --------- Small helpers --------- */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalMidnight(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return { h, m };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function format12h(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${pad(m)}${ampm}`;
}

function sameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** Returns 0..6 (Sun..Sat) */
function getDayOfWeek(date: Date) {
  return date.getDay();
}

/** Given working blocks for that day and a duration, compute slot candidates */
function buildTimeSlotsForDay(
  date: Date,
  blocks: Array<{ startHHMM: string; endHHMM: string }>,
  durationMin: number,
  stepMin = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const base = toLocalMidnight(date);

  for (const b of blocks) {
    const { h: sh, m: sm } = parseHHMM(b.startHHMM);
    const { h: eh, m: em } = parseHHMM(b.endHHMM);

    const blockStart = new Date(base);
    blockStart.setHours(sh, sm, 0, 0);

    const blockEnd = new Date(base);
    blockEnd.setHours(eh, em, 0, 0);

    // move a sliding window of size durationMin with step stepMin
    for (
      let start = new Date(blockStart);
      addMinutes(start, durationMin) <= blockEnd;
      start = addMinutes(start, stepMin)
    ) {
      const end = addMinutes(start, durationMin);
      slots.push({
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        label: `${format12h(start)} - ${format12h(end)}`,
      });
    }
  }

  // De-dup / sort
  const unique = new Map(slots.map((s) => [s.startISO, s]));
  return Array.from(unique.values()).sort((a, b) =>
    a.startISO.localeCompare(b.startISO)
  );
}

/** --------- The hook --------- */

const useAppointments = () => {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch all stylists (adjust columns as needed) */
  const fetchStylists = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("Stylist")
      .select("stylist_id, name");
    if (error) setError(error.message);
    setStylists((data ?? []) as any);
    return data ?? [];
  }, []);

  /** Fetch all services (we’ll filter by stylist later using StylistServices) */
  const fetchAllServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("Service")
      .select("service_id, name, duration, min_price, max_price, display");
    if (error) setError(error.message);
    setServices((data ?? []) as any);
    return data ?? [];
  }, []);

  /** Fetch packages that can be shown (display === true) */
  const fetchAllPackages = useCallback(async () => {
    const { data, error } = await supabase
      .from("Package")
      .select(
        "package_id, name, price, status, start_date, end_date, expected_duration, display"
      )
      .eq("display", true);
    if (error) setError(error.message);
    setPackages((data ?? []) as any);
    return data ?? [];
  }, []);

  /** Fetch a stylist’s schedule (all days) */
  const fetchStylistSchedule = useCallback(async (stylistId: string) => {
    const { data, error } = await supabase
      .from("StylistSchedules")
      .select(
        "stylistSchedule_id, stylist_id, day_of_week, start_time, end_time"
      )
      .eq("stylist_id", stylistId);
    if (error) setError(error.message);
    return (data ?? []) as StylistSchedule[];
  }, []);

  /** Fetch service ids the stylist can perform */
  const fetchStylistServiceIds = useCallback(async (stylistId: string) => {
    const { data, error } = await supabase
      .from("StylistServices")
      .select("stylistServices_id, stylist_id, service_id")
      .eq("stylist_id", stylistId);
    if (error) setError(error.message);
    const ids = ((data ?? []) as StylistServiceLink[]).map((r) => r.service_id);
    return Array.from(new Set(ids));
  }, []);

  /** Build plan options for a given stylist: stylist’s services + all packages */
  const getPlanOptionsForStylist = useCallback(
    async (stylistId: string): Promise<PlanOption[]> => {
      setLoading(true);
      setError(null);
      try {
        // Ensure base data exists
        if (services.length === 0) await fetchAllServices();
        if (packages.length === 0) await fetchAllPackages();

        const allowedServiceIds = await fetchStylistServiceIds(stylistId);

        const svcOptions: PlanOption[] = services
          .filter(
            (s) =>
              allowedServiceIds.includes(s.service_id) && (s.display ?? true)
          )
          .map((s) => ({
            kind: "service" as const,
            id: s.service_id,
            name: s.name,
            duration: Number(s.duration ?? 0),
          }));

        // For packages: include those with expected_duration > 0 and Active (optional check)
        const pkgOptions: PlanOption[] = packages
          .filter((p) => (p.display ?? true) && p.status !== "Inactive")
          .map((p) => ({
            kind: "package" as const,
            id: p.package_id,
            name: p.name ?? `Package ${p.package_id.slice(0, 6)}`,
            duration: Number(p.expected_duration ?? 0),
          }));

        return [...svcOptions, ...pkgOptions].filter((o) => o.duration > 0);
      } finally {
        setLoading(false);
      }
    },
    [
      services,
      packages,
      fetchAllServices,
      fetchAllPackages,
      fetchStylistServiceIds,
    ]
  );

  /** Compute time slots for a chosen day & plan */
  const getAvailableTimeSlots = useCallback(
    async (params: {
      stylistId: string;
      date: Date;
      plan: PlanOption | null;
      stepMinutes?: number; // default 30
    }) => {
      const { stylistId, date, plan, stepMinutes = 30 } = params;
      if (!stylistId || !date || !plan) return [] as TimeSlot[];

      const schedule = await fetchStylistSchedule(stylistId);
      const dow = getDayOfWeek(date);

      const blocks = schedule
        .filter((b) => Number(b.day_of_week) === dow)
        .map((b) => ({
          startHHMM: b.start_time,
          endHHMM: b.end_time,
        }));

      if (blocks.length === 0) return [];

      const slots = buildTimeSlotsForDay(
        date,
        blocks,
        plan.duration,
        stepMinutes
      );
      return slots;
    },
    [fetchStylistSchedule]
  );

  /** Optional: active discounts for display in the dropdown */
  const fetchActiveDiscounts = useCallback(async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
      today.getDate()
    )}`;
    // status=Active and ((no date range) or inside range). If you have "display" column, keep eq("display", true)
    const { data, error } = await supabase
      .from("Discounts")
      .select(
        "discount_id, name, type, value, applies_to, start_date, end_date, amount_of_uses, status, display"
      )
      .eq("status", "Active")
      .or(
        `start_date.is.null,end_date.is.null,and(start_date.lte.${todayStr},end_date.gte.${todayStr})`
      );
    if (error) setError(error.message);
    setDiscounts((data ?? []) as any);
    return data ?? [];
  }, []);

  /** Convenience: initial boot (stylists + services + packages + discounts) */
  const boot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchStylists(),
        fetchAllServices(),
        fetchAllPackages(),
        fetchActiveDiscounts(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchStylists, fetchAllServices, fetchAllPackages, fetchActiveDiscounts]);

  return {
    // state
    stylists,
    services,
    packages,
    discounts,
    loading,
    error,

    // actions
    boot,
    fetchStylists,
    fetchAllServices,
    fetchAllPackages,
    fetchActiveDiscounts,
    getPlanOptionsForStylist,
    getAvailableTimeSlots,
  };
};

export default useAppointments;
