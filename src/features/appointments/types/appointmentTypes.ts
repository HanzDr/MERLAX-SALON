/* ---------- Shared Types for Appointments Feature ---------- */

import type { AppointmentStatus } from "./appointmentStatus";
export type PaymentMethod = "Cash" | "Card" | "GCash";

/* Raw DB rows (normalized to your UI expectations) */
export type AppointmentRow = {
  appointment_id: string;
  date: string; // YYYY-MM-DD
  expectedStart_time: string; // HH:MM
  expectedEnd_time: string; // HH:MM
  comments?: string | null;
  total_amount?: number | null;
  payment_method?: PaymentMethod | null;
  status?: AppointmentStatus;
  display?: boolean;
  customer_id?: string | null;
};

export type Service = {
  service_id: string;
  name: string;
  duration: number;
  min_price?: number | null;
  max_price?: number | null;
  display?: boolean | null;
};

export type PackageRow = {
  package_id: string;
  name: string;
  price: number;
  expected_duration: number;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  display?: boolean | null;
};

/* Discount usage/eligibility */
export type DiscountLimitRow = {
  discount_id: string;
  amount_of_uses: number | null;
};

export type DiscountEligibility =
  | {
      ok: true;
      global_used: number;
      global_limit: number | null;
      customer_used: number;
      customer_limit: number | null;
    }
  | {
      ok: false;
      reason: "not_found" | "global" | "customer";
      global_used: number;
      global_limit: number | null;
      customer_used: number;
      customer_limit: number | null;
    };

/* Admin list/table models */
export type AdminAppt = {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  customer: string; // fallback "—" or "Walk-In"
  plan: string; // service/package name if any
  stylist: string; // stylist name if any
  status: AppointmentStatus;
  price: number; // best-effort number (0 if unknown)
  customer_id?: string | null;
};

/* History table rows returned to UI */
export type HistoryRow = {
  id: string;
  customer_name: string | null;
  stylist_name: string | null;
  service_date: string; // YYYY-MM-DD
  status: AppointmentStatus; // keep loose for any legacy values
  total_amount: number | null;
  notes: string | null;
  customer_id: string | null;
};

