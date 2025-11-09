// useAnalytics.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseclient";

/* ========================= Types ========================= */

export type RangePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_6_months"
  | "this_year"
  | "custom";

export type DateRange = {
  preset: RangePreset;
  start?: string; // YYYY-MM-DD (used when preset === "custom")
  end?: string; // YYYY-MM-DD
};

export type CountItem = { id: string; name: string; count: number };

export type AnalyticsData = {
  // Appointments
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;

  // Deltas vs previous comparable period
  totalDeltaPct: number | null;
  completedDeltaPct: number | null;
  cancelledDeltaPct: number | null;
  avgRatingDeltaPct: number | null;

  // Trend (formatted dates)
  apptTrend: Array<{ date: string; count: number }>;

  // Stylists (completed)
  topStylists: CountItem[];

  // Services/Packages share (completed)
  servicesShare: Array<{ name: string; count: number }>;

  // Feedback
  totalFeedback: number;
  avgRating: number | null;
  feedbackByCategory: Array<{ category: string; count: number }>;
};

/* ========================= Date helpers ========================= */

const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const monthShort = (i: number) =>
  [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][i];

/** Format "YYYY-MM-DD" -> "Oct 14, 2025" */
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${monthShort((m || 1) - 1)} ${d}, ${y}`;
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31);
}

function resolveRange(r: DateRange): { start: string; end: string } {
  const now = new Date();
  let start: string;
  let end: string;

  switch (r.preset) {
    case "today": {
      const iso = toISODate(now);
      start = iso;
      end = iso;
      break;
    }
    case "this_week": {
      start = toISODate(startOfWeek(now));
      end = toISODate(endOfWeek(now));
      break;
    }
    case "this_month": {
      start = toISODate(startOfMonth(now));
      end = toISODate(endOfMonth(now));
      break;
    }
    case "last_6_months": {
      const e = now;
      const s = new Date(now);
      s.setMonth(s.getMonth() - 5);
      s.setDate(1);
      start = toISODate(s);
      end = toISODate(endOfMonth(e));
      break;
    }
    case "this_year": {
      start = toISODate(startOfYear(now));
      end = toISODate(endOfYear(now));
      break;
    }
    case "custom":
    default: {
      start = r.start ?? toISODate(now);
      end = r.end ?? start;
    }
  }
  return { start, end };
}

/** Get N days between two YYYY-MM-DD inclusive */
function daysBetween(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  return Math.max(1, Math.round((+e - +s) / (1000 * 60 * 60 * 24)) + 1);
}

/** Previous comparable window for deltas */
function previousWindow(startISO: string, endISO: string) {
  const n = daysBetween(startISO, endISO);
  const s = new Date(startISO);
  s.setDate(s.getDate() - n);
  const e = new Date(endISO);
  e.setDate(e.getDate() - n);
  return { start: toISODate(s), end: toISODate(e) };
}

/** Percentage delta helper */
function pctDelta(current: number, prev: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return null;
  if (prev === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - prev) / prev) * 100);
}

/* ========================= Hook ========================= */

const useAnalytics = () => {
  const [range, setRange] = useState<DateRange>({ preset: "this_month" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalDeltaPct: null,
    completedDeltaPct: null,
    cancelledDeltaPct: null,
    avgRatingDeltaPct: null,
    apptTrend: [],
    topStylists: [],
    servicesShare: [],
    totalFeedback: 0,
    avgRating: null,
    feedbackByCategory: [],
  });

  const resolved = useMemo(() => resolveRange(range), [range]);
  const prevResolved = useMemo(
    () => previousWindow(resolved.start, resolved.end),
    [resolved]
  );

  const refresh = useCallback(async () => {
    const { start, end } = resolved;
    const prev = prevResolved;
    try {
      setLoading(true);
      setError(null);

      /* ---------- Appointments: current window ---------- */
      const { data: appts, error: apptErr } = await supabase
        .from("Appointments")
        .select("appointment_id,status,date,display")
        .gte("date", start)
        .lte("date", end)
        .eq("display", true);
      if (apptErr) throw apptErr;

      const apptRows = (appts ?? []) as Array<{
        appointment_id: string;
        status: string | null;
        date: string | null;
        display: boolean | null;
      }>;

      const isCompleted = (s: string | null) => /complete/i.test(s ?? "");
      const isCancelled = (s: string | null) => /cancel/i.test(s ?? "");

      const totalAppointments = apptRows.length;
      const completedAppointments = apptRows.filter((r) =>
        isCompleted(r.status)
      ).length;
      const cancelledAppointments = apptRows.filter((r) =>
        isCancelled(r.status)
      ).length;

      // Build trend (group by day)
      const countsByDay = new Map<string, number>();
      apptRows.forEach((r) => {
        if (!r.date) return;
        countsByDay.set(r.date, (countsByDay.get(r.date) ?? 0) + 1);
      });

      // Fill the range so the line is continuous
      const trend: Array<{ date: string; count: number }> = [];
      const totalDays = daysBetween(start, end);
      const cursor = new Date(start);
      for (let i = 0; i < totalDays; i++) {
        const iso = toISODate(cursor);
        trend.push({ date: prettyDate(iso), count: countsByDay.get(iso) ?? 0 });
        cursor.setDate(cursor.getDate() + 1);
      }

      // Completed IDs (for stylists/services)
      const completedIds = new Set(
        apptRows
          .filter((r) => isCompleted(r.status))
          .map((r) => r.appointment_id)
      );
      const completedList = Array.from(completedIds);

      /* ---------- Stylists among completed ---------- */
      let topStylists: CountItem[] = [];
      if (completedList.length) {
        const { data: links, error: linkErr } = await supabase
          .from("AppointmentStylists")
          .select("appointment_id,stylist_id")
          .in("appointment_id", completedList);
        if (linkErr) throw linkErr;

        const counts = new Map<string, number>();
        const stylistIds = new Set<string>();
        (links ?? []).forEach((l: any) => {
          const sid = l.stylist_id ?? "";
          if (!sid) return;
          stylistIds.add(sid);
          counts.set(sid, (counts.get(sid) ?? 0) + 1);
        });

        let nameById = new Map<string, string>();
        if (stylistIds.size) {
          const { data: stylists, error: sErr } = await supabase
            .from("Stylists")
            .select("stylist_id,name")
            .in("stylist_id", Array.from(stylistIds));
          if (sErr) throw sErr;
          nameById = new Map(
            (stylists ?? []).map((s: any) => [s.stylist_id, s.name as string])
          );
        }

        topStylists = Array.from(counts.entries())
          .map(([id, count]) => ({
            id,
            name: nameById.get(id) ?? "Unknown",
            count,
          }))
          .sort((a, b) => b.count - a.count);
      }

      /* ---------- Services/Packages share among completed ---------- */
      let servicesShare: Array<{ name: string; count: number }> = [];
      if (completedList.length) {
        const { data: plans, error: planErr } = await supabase
          .from("AppointmentServicePlan")
          .select("appointment_id,service_id,package_id")
          .in("appointment_id", completedList);
        if (planErr) throw planErr;

        const svcCounts = new Map<string, number>();
        const pkgCounts = new Map<string, number>();
        const svcIds = new Set<string>();
        const pkgIds = new Set<string>();

        (plans ?? []).forEach((p: any) => {
          if (p.service_id) {
            svcIds.add(p.service_id);
            svcCounts.set(p.service_id, (svcCounts.get(p.service_id) ?? 0) + 1);
          }
          if (p.package_id) {
            pkgIds.add(p.package_id);
            pkgCounts.set(p.package_id, (pkgCounts.get(p.package_id) ?? 0) + 1);
          }
        });

        let svcNameById = new Map<string, string>();
        if (svcIds.size) {
          const { data: svcs, error: sErr } = await supabase
            .from("Services")
            .select("service_id,name")
            .in("service_id", Array.from(svcIds));
          if (sErr) throw sErr;
          svcNameById = new Map(
            (svcs ?? []).map((s: any) => [s.service_id, s.name as string])
          );
        }

        let pkgNameById = new Map<string, string>();
        if (pkgIds.size) {
          const { data: pkgs, error: pErr } = await supabase
            .from("Package")
            .select("package_id,name")
            .in("package_id", Array.from(pkgIds));
          if (pErr) throw pErr;
          pkgNameById = new Map(
            (pkgs ?? []).map((p: any) => [p.package_id, p.name as string])
          );
        }

        const svcArr = Array.from(svcCounts.entries()).map(([id, count]) => ({
          name: svcNameById.get(id) ?? "Service",
          count,
        }));
        const pkgArr = Array.from(pkgCounts.entries()).map(([id, count]) => ({
          name: pkgNameById.get(id) ?? "Package",
          count,
        }));

        servicesShare = [...svcArr, ...pkgArr].sort(
          (a, b) => b.count - a.count
        );
      }

      /* ---------- Feedback (current window) ---------- */
      const { data: fbs, error: fbErr } = await supabase
        .from("Feedback")
        .select("category,rating,created_at,isDisplay")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`);
      if (fbErr) throw fbErr;

      const fbRows = (fbs ?? []).filter(
        (f: any) => f.isDisplay == null || f.isDisplay === true
      ) as Array<{ category: string | null; rating: number | null }>;

      const totalFeedback = fbRows.length;
      const ratings = fbRows
        .map((f) => Number(f.rating))
        .filter((n) => Number.isFinite(n));
      const avgRating =
        ratings.length > 0
          ? Math.round(
              (ratings.reduce((s, n) => s + n, 0) / ratings.length) * 100
            ) / 100
          : null;

      const byCategory = new Map<string, number>();
      fbRows.forEach((f) => {
        const key = (f.category ?? "Uncategorized").trim() || "Uncategorized";
        byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
      });
      const feedbackByCategory = Array.from(byCategory.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      /* ---------- PREVIOUS window for deltas ---------- */
      const { data: prevAppts, error: prevErr } = await supabase
        .from("Appointments")
        .select("appointment_id,status,date,display")
        .gte("date", prev.start)
        .lte("date", prev.end)
        .eq("display", true);
      if (prevErr) throw prevErr;

      const prevRows = (prevAppts ?? []) as Array<{
        appointment_id: string;
        status: string | null;
        date: string | null;
        display: boolean | null;
      }>;

      const prevTotal = prevRows.length;
      const prevCompleted = prevRows.filter((r) =>
        isCompleted(r.status)
      ).length;
      const prevCancelled = prevRows.filter((r) =>
        isCancelled(r.status)
      ).length;

      const { data: prevFbs, error: prevFbErr } = await supabase
        .from("Feedback")
        .select("rating,created_at,isDisplay")
        .gte("created_at", `${prev.start}T00:00:00`)
        .lte("created_at", `${prev.end}T23:59:59`);
      if (prevFbErr) throw prevFbErr;

      const prevFRows = (prevFbs ?? []).filter(
        (f: any) => f.isDisplay == null || f.isDisplay === true
      ) as Array<{ rating: number | null }>;
      const prevRatings = prevFRows
        .map((f) => Number(f.rating))
        .filter((n) => Number.isFinite(n));
      const prevAvg =
        prevRatings.length > 0
          ? prevRatings.reduce((s, n) => s + n, 0) / prevRatings.length
          : null;

      // Deltas
      const totalDeltaPct = pctDelta(totalAppointments, prevTotal);
      const completedDeltaPct = pctDelta(completedAppointments, prevCompleted);
      const cancelledDeltaPct = pctDelta(cancelledAppointments, prevCancelled);
      const avgRatingDeltaPct =
        avgRating != null && prevAvg != null
          ? pctDelta(avgRating, prevAvg)
          : null;

      setData({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalDeltaPct,
        completedDeltaPct,
        cancelledDeltaPct,
        avgRatingDeltaPct,
        apptTrend: trend,
        topStylists,
        servicesShare,
        totalFeedback,
        avgRating,
        feedbackByCategory,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics.");
      setData({
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        totalDeltaPct: null,
        completedDeltaPct: null,
        cancelledDeltaPct: null,
        avgRatingDeltaPct: null,
        apptTrend: [],
        topStylists: [],
        servicesShare: [],
        totalFeedback: 0,
        avgRating: null,
        feedbackByCategory: [],
      });
    } finally {
      setLoading(false);
    }
  }, [resolved, prevResolved]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    range,
    setRange,
    resolvedRange: resolved,
    loading,
    error,
    ...data,
    refresh,
  };
};

export default useAnalytics;
