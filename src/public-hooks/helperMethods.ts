import { useMemo } from "react";

/** Convert a Date to YYYY-MM-DD (local time, no TZ shift). */
export const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** 24h "HH:MM" → "h:MMAM/PM" (e.g., "13:30" -> "1:30PM"). */
export const formatAMPMCompact = (hhmm: string): string => {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${ampm}`;
};

/** "YYYY-MM-DD" (or "YYYY-MM-DDTHH...") → "Month D, YYYY" (locale aware). */
export const formatDateLong = (iso: string): string => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [y, m, d] = (match ? [match[1], match[2], match[3]] : ["", "", ""]).map(
    Number
  );
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/** Format a number to Philippine Peso (₱1,234.56). */
export const fmtPHP = (n: number): string =>
  `₱${Number(n).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Common booking limits: today, +21 days, and no Sundays selectable. */
export const useBookingLimits = () => {
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d;
  }, []);
  const isSunday = (date: Date) => date.getDay() !== 0;
  return { today, maxDate, isSunday };
};
