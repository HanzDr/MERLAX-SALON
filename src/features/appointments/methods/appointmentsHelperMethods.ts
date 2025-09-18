/* ---------- Pure helpers / utilities for Appointments ---------- */

// Map 0..6 → Sun..Sat
export const dayKey = (d: number) =>
  (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[d];

// Accepts number (0..6), "Sun"/"Sunday", or "0".."6"
export const normalizeDay = (val: string | number) => {
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (typeof val === "number") return map[val] ?? "";
  const s = String(val ?? "").trim();
  const n = Number(s);
  if (!Number.isNaN(n) && n >= 0 && n <= 6) return map[n];
  const lower = s.toLowerCase();
  const idx = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(
    lower.slice(0, 3)
  );
  return idx >= 0 ? map[idx] : "";
};

// Parse local date from "YYYY-MM-DD" without TZ shift
export const localDateFromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Time math
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toHHMM = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
    2,
    "0"
  )}`;
export const addMin = (hhmm: string, d: number) => toHHMM(toMin(hhmm) + d);
export const overlap = (aS: string, aE: string, bS: string, bE: string) =>
  Math.max(toMin(aS), toMin(bS)) < Math.min(toMin(aE), toMin(bE));

// Date helpers
export const isTodayISO = (iso: string) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === iso;
};
export const roundUp15 = (mins: number) => Math.ceil(mins / 15) * 15;

// Which appointment statuses count as a discount redemption
export const COUNT_STATUSES = ["Booked", "Confirmed", "Completed"] as const;

/** Build a nice display name from Customers table fields. */
export const buildCustomerName = (c?: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
}) => {
  if (!c) return null;
  const parts = [
    c.firstName?.trim(),
    c.middleName?.trim(),
    c.lastName?.trim(),
  ].filter(Boolean) as string[];
  if (!parts.length) return null;
  // Middle name → initial if it’s long, else keep as-is
  const normalized = parts.map((p, i) =>
    i === 1 && p.length > 1 ? `${p[0]}.` : p
  );
  return normalized.join(" ");
};
