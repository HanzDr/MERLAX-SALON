import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import type {
  PaymentMethod,
  AppointmentRow,
  Service,
  PackageRow,
  DiscountEligibility,
  DiscountLimitRow,
  AdminAppt,
  HistoryRow,
} from "../types/appointmentTypes";
import {
  dayKey,
  normalizeDay,
  localDateFromISO,
  toMin,
  toHHMM,
  addMin,
  overlap,
  isTodayISO,
  roundUp15,
  COUNT_STATUSES,
  buildCustomerName,
} from "../methods/appointmentsHelperMethods";

/* === DB naming adapters (match your actual schema) === */
const TBL_APPT_STYLIST = "AppointmentStylists"; // singular in your DB
const TBL_APPT_PLAN = "AppointmentServicePlan";
const COL_PACKAGE_ID = "package_id" as const; // <-- use this consistently

/* ===================================================================== */
export function useAppointments() {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);

  const loadServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("Services")
      .select("service_id,name,duration,min_price,max_price,display")
      .eq("display", true);
    if (error) throw error;
    setServices(data ?? []);
    return data ?? [];
  }, []);

  const loadPackages = useCallback(async () => {
    const { data, error } = await supabase
      .from("Package")
      .select(
        "package_id,name,price,expected_duration,status,start_date,end_date,display"
      )
      .eq("display", true);
    if (error) throw error;
    setPackages(data ?? []);
    return data ?? [];
  }, []);

  /** Stable plan options (no date filter). */
  const getPlanOptionsForStylist = useCallback(
    async (stylist_id: string) => {
      if (!services.length) await loadServices();
      if (!packages.length) await loadPackages();

      const svcIdsRes = await supabase
        .from("StylistServices")
        .select("service_id")
        .eq("stylist_id", stylist_id);
      if (svcIdsRes.error) throw svcIdsRes.error;

      const allowed = new Set((svcIdsRes.data ?? []).map((r) => r.service_id));

      const svcOpts = services
        .filter((s) => allowed.has(s.service_id))
        .map((s) => ({
          type: "Service" as const,
          id: s.service_id,
          name: s.name,
          duration: s.duration,
        }));

      const pkgOpts = packages
        .filter((p) => (p.status ?? "Active").toLowerCase() === "active")
        .map((p) => ({
          type: "Package" as const,
          id: p.package_id,
          name: p.name,
          duration: Number(p.expected_duration ?? 0) || 0,
        }));

      return [...svcOpts, ...pkgOpts].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    },
    [services, packages, loadServices, loadPackages]
  );

  /** Available slots from schedules + appointments (2-step, no join) */
  const getAvailableTimeSlots = useCallback(
    async (args: {
      stylist_id: string;
      plan: { type: "Service" | "Package"; id: string };
      date: string; // YYYY-MM-DD
    }) => {
      const weekday = dayKey(localDateFromISO(args.date).getDay());

      // 1) Schedules
      const schedRes = await supabase
        .from("StylistSchedules")
        .select("day_of_week,start_time,end_time")
        .eq("stylist_id", args.stylist_id);
      if (schedRes.error) throw schedRes.error;

      const windows = (schedRes.data ?? [])
        .map((r) => ({
          day: normalizeDay(r.day_of_week),
          start: String(r.start_time).slice(0, 5),
          end: String(r.end_time).slice(0, 5),
        }))
        .filter((w) => w.day === weekday)
        .map((w) => ({ start: w.start, end: w.end }));

      // 2) Duration
      let duration = 0;

      if (args.plan.type === "Service") {
        const svcLocal = services.find((s) => s.service_id === args.plan.id);
        if (svcLocal) {
          duration = Number(svcLocal.duration ?? 0) || 0;
        } else {
          const { data, error } = await supabase
            .from("Services")
            .select("duration")
            .eq("service_id", args.plan.id)
            .single();
          if (error) throw error;
          duration =
            Number(
              (data as { duration?: number | null } | null)?.duration ?? 0
            ) || 0;
        }
      } else {
        const pkgLocal = packages.find((p) => p.package_id === args.plan.id);
        if (pkgLocal) {
          duration = Number(pkgLocal.expected_duration ?? 0) || 0;
        } else {
          const { data, error } = await supabase
            .from("Package")
            .select("expected_duration")
            .eq("package_id", args.plan.id)
            .single();
          if (error) throw error;
          duration =
            Number(
              (data as { expected_duration?: number | null } | null)
                ?.expected_duration ?? 0
            ) || 0;
        }
      }

      if (duration <= 0 || windows.length === 0) return [];

      // 3) Busy times — uses singular AppointmentStylists
      const links = await supabase
        .from(TBL_APPT_STYLIST)
        .select("appointment_id")
        .eq("stylist_id", args.stylist_id);
      if (links.error) throw links.error;

      const ids = (links.data ?? [])
        .map((r: any) => r.appointment_id)
        .filter(Boolean);

      let busy: { start: string; end: string }[] = [];
      if (ids.length > 0) {
        const apptRes = await supabase
          .from("Appointments")
          .select(
            "expectedStart_time,expectedEnd_time,status,display,date,appointment_id"
          )
          .in("appointment_id", ids)
          .eq("date", args.date)
          .eq("display", true);
        if (apptRes.error) throw apptRes.error;

        busy = (apptRes.data ?? [])
          .filter((a) => (a.status ?? "Booked").toLowerCase() !== "cancelled")
          .map((a) => ({
            start: String(a.expectedStart_time).slice(0, 5),
            end: String(a.expectedEnd_time).slice(0, 5),
          }));
      }

      // 4) Build slots
      const step = 15;
      const slots: { start: string; end: string }[] = [];

      const now = new Date();
      const cutoff = isTodayISO(args.date)
        ? roundUp15(now.getHours() * 60 + now.getMinutes())
        : null;

      for (const w of windows) {
        let startMin = toMin(w.start);
        if (cutoff !== null) startMin = Math.max(startMin, cutoff);

        const latestStart = toMin(w.end) - duration;
        let cursor = toHHMM(startMin);
        while (toMin(cursor) <= latestStart) {
          const end = addMin(cursor, duration);
          const conflict = busy.some((b) =>
            overlap(cursor, end, b.start, b.end)
          );
          if (!conflict) slots.push({ start: cursor, end });
          cursor = addMin(cursor, step);
        }
      }

      return slots;
    },
    [services, packages]
  );

  /* --------------------- Discount eligibility --------------------- */
  const canUseDiscount = useCallback(
    async (args: {
      discount_id: string;
      customer_id?: string | null;
    }): Promise<DiscountEligibility> => {
      const { discount_id, customer_id } = args;

      const { data: disc, error: discErr } = await supabase
        .from("Discounts")
        .select("discount_id,amount_of_uses")
        .eq("discount_id", discount_id)
        .single();

      if (discErr || !disc) {
        return {
          ok: false,
          reason: "not_found",
          global_used: 0,
          global_limit: null,
          customer_used: 0,
          customer_limit: null,
        };
      }

      const limits = disc as DiscountLimitRow;
      const globalCap = limits.amount_of_uses;
      const customerCap = 1 as number | null; // DEFAULT_PER_CUSTOMER_LIMIT

      const { data: links, error: linkErr } = await supabase
        .from("AppointmentDiscount")
        .select("appointment_id")
        .eq("discount_id", discount_id);
      if (linkErr) throw linkErr;

      const apptIds = (links ?? [])
        .map((r: any) => r.appointment_id)
        .filter(Boolean);

      let appts: AppointmentRow[] = [];
      if (apptIds.length > 0) {
        const { data: apptsData, error: apptsErr } = await supabase
          .from("Appointments")
          .select("appointment_id, customer_id, status, display")
          .in("appointment_id", apptIds)
          .eq("display", true)
          .in("status", COUNT_STATUSES as unknown as string[]);
        if (apptsErr) throw apptsErr;
        appts = (apptsData ?? []) as AppointmentRow[];
      }

      const globalUsed = appts.length;
      const customerUsed =
        customer_id == null
          ? 0
          : appts.filter((a) => a.customer_id === customer_id).length;

      if (globalCap != null && globalUsed >= globalCap) {
        return {
          ok: false,
          reason: "global",
          global_used: globalUsed,
          global_limit: globalCap,
          customer_used: customerUsed,
          customer_limit: customerCap,
        };
      }

      if (customer_id && customerCap != null && customerUsed >= customerCap) {
        return {
          ok: false,
          reason: "customer",
          global_used: globalUsed,
          global_limit: globalCap,
          customer_used: customerUsed,
          customer_limit: customerCap,
        };
      }

      return {
        ok: true,
        global_used: globalUsed,
        global_limit: globalCap,
        customer_used: customerUsed,
        customer_limit: customerCap,
      };
    },
    []
  );

  const filterEligibleDiscountsForCustomer = useCallback(
    async (discountIds: string[], customer_id?: string | null) => {
      if (discountIds.length === 0) return [];
      const checks = await Promise.all(
        discountIds.map((id) =>
          canUseDiscount({ discount_id: id, customer_id })
        )
      );
      return discountIds.filter((_, i) => checks[i].ok);
    },
    [canUseDiscount]
  );

  /* ------------------------------ CRUD ------------------------------ */
  const createAppointment = useCallback(
    async (args: {
      stylist_id: string;
      plan_type: "Service" | "Package";
      plan_id: string;
      date: string;
      expectedStart_time: string;
      expectedEnd_time: string;
      customer_id?: string | null;
      comments?: string | null;
      total_amount?: number | null;
      payment_method?: PaymentMethod | null;
      discount_id?: string | null;

      // 👇 NEW: walk-in names (schema has firstName, lastName)
      firstName?: string;
      lastName?: string;
      middleName?: string;
    }) => {
      const isWalkIn = !args.customer_id;

      const insertPayload: any = {
        date: args.date,
        expectedStart_time: args.expectedStart_time,
        expectedEnd_time: args.expectedEnd_time,
        comments: args.comments ?? null,
        total_amount: args.total_amount ?? null,
        payment_method: args.payment_method ?? null,
        status: isWalkIn ? "Walk-In" : "Booked", // 👈 distinguish in DB
        display: true,
        customer_id: args.customer_id ?? null,
      };

      // Only populate name fields for walk-ins
      if (isWalkIn) {
        if (args.firstName) insertPayload.firstName = args.firstName;
        if (args.lastName) insertPayload.lastName = args.lastName;
        if (args.middleName) insertPayload.middleName = args.middleName;
      }

      const { data: appt, error } = await supabase
        .from("Appointments")
        .insert(insertPayload)
        .select("appointment_id")
        .single();
      if (error) throw error;

      const appointmentId = appt.appointment_id;

      // singular AppointmentStylists
      const { error: stylistErr } = await supabase
        .from(TBL_APPT_STYLIST)
        .insert({ appointment_id: appointmentId, stylist_id: args.stylist_id });
      if (stylistErr) throw stylistErr;

      // AppointmentServicePlan with package_id
      const planRow =
        args.plan_type === "Service"
          ? {
              appointment_id: appointmentId,
              service_id: args.plan_id,
              [COL_PACKAGE_ID]: null,
            }
          : {
              appointment_id: appointmentId,
              service_id: null,
              [COL_PACKAGE_ID]: args.plan_id,
            };

      const { error: planErr } = await supabase
        .from(TBL_APPT_PLAN)
        .insert(planRow as any);
      if (planErr) throw planErr;

      if (args.discount_id) {
        const { error: discErr } = await supabase
          .from("AppointmentDiscount")
          .insert({
            appointment_id: appointmentId,
            discount_id: args.discount_id,
          });
        if (discErr) throw discErr;
      }

      return appointmentId;
    },
    []
  );

  const updateAppointment = useCallback(
    async (appointment_id: string, patch: Partial<AppointmentRow>) => {
      const { error } = await supabase
        .from("Appointments")
        .update(patch)
        .eq("appointment_id", appointment_id)
        .eq("display", true);
      if (error) throw error;
      return true;
    },
    []
  );

  /** 🧩 Admin modal: replace stylists/plans + update amount/payment (schema-aligned) */
  const updateAppointmentDetails = useCallback(
    async (args: {
      appointment_id: string;
      stylist_ids: string[]; // full replacement
      plans: Array<{ type: "Service" | "Package"; id: string }>; // full replacement
      total_amount?: number | null;
      payment_method?: PaymentMethod | null;
    }) => {
      const {
        appointment_id,
        stylist_ids,
        plans,
        total_amount,
        payment_method,
      } = args;

      // 1) Update amount / payment
      if (total_amount != null || payment_method != null) {
        const { error } = await supabase
          .from("Appointments")
          .update({
            ...(total_amount != null ? { total_amount } : {}),
            ...(payment_method != null ? { payment_method } : {}),
          })
          .eq("appointment_id", appointment_id)
          .eq("display", true);
        if (error) throw error;
      }

      // 2) Replace stylists (delete → insert) on AppointmentStylists
      {
        const { error: delErr } = await supabase
          .from(TBL_APPT_STYLIST)
          .delete()
          .eq("appointment_id", appointment_id);
        if (delErr) throw delErr;

        if (stylist_ids.length) {
          const rows = stylist_ids.map((stylist_id) => ({
            appointment_id,
            stylist_id,
          }));
          const { error: insErr } = await supabase
            .from(TBL_APPT_STYLIST)
            .insert(rows);
          if (insErr) throw insErr;
        }
      }

      // 3) Replace plans (delete → insert) on AppointmentServicePlan
      {
        const { error: delErr } = await supabase
          .from(TBL_APPT_PLAN)
          .delete()
          .eq("appointment_id", appointment_id);
        if (delErr) throw delErr;

        if (plans.length) {
          const rows = plans.map((p) =>
            p.type === "Service"
              ? { appointment_id, service_id: p.id, [COL_PACKAGE_ID]: null }
              : { appointment_id, service_id: null, [COL_PACKAGE_ID]: p.id }
          );

          const { error: insErr } = await supabase
            .from(TBL_APPT_PLAN)
            .insert(rows as any[]);
          if (insErr) throw insErr;
        }
      }

      return true;
    },
    []
  );

  const softDeleteAppointment = useCallback(async (appointment_id: string) => {
    const { error } = await supabase
      .from("Appointments")
      .update({ display: false })
      .eq("appointment_id", appointment_id);
    if (error) throw error;
    return true;
  }, []);

  /* ----------------- Admin: Next 3 weeks (Mon–Sat) ----------------- */
  const loadUpcomingAdminAppointments = useCallback(async (): Promise<
    AdminAppt[]
  > => {
    const toISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    const now = new Date();
    const startISO = toISO(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 20);
    const endISO = toISO(end);

    const { data: apptsRaw, error: apptErr } = await supabase
      .from("Appointments")
      .select(
        "appointment_id,date,expectedStart_time,expectedEnd_time,status,customer_id,display,total_amount"
      )
      .gte("date", startISO)
      .lte("date", endISO)
      .eq("display", true);
    if (apptErr) throw apptErr;

    const monToSat = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      const dow = dt.getDay();
      return dow >= 1 && dow <= 6;
    };

    const appts = (apptsRaw ?? []).filter((a) => monToSat(a.date));
    if (appts.length === 0) return [];

    const apptIds = appts.map((a) => a.appointment_id);

    // --- Stylists (collect ALL stylists per appointment)
    const { data: links, error: linkErr } = await supabase
      .from(TBL_APPT_STYLIST)
      .select("appointment_id,stylist_id")
      .in("appointment_id", apptIds);
    if (linkErr) throw linkErr;

    const apptToStylistIds = new Map<string, string[]>();
    const stylistIds = new Set<string>();
    for (const l of links ?? []) {
      const arr = apptToStylistIds.get(l.appointment_id) ?? [];
      if (l.stylist_id) {
        arr.push(l.stylist_id);
        stylistIds.add(l.stylist_id);
      }
      apptToStylistIds.set(l.appointment_id, arr);
    }

    let stylistNameById = new Map<string, string>();
    if (stylistIds.size > 0) {
      const { data: stylistsData, error: sErr } = await supabase
        .from("Stylists")
        .select("stylist_id,name")
        .in("stylist_id", Array.from(stylistIds));
      if (sErr) throw sErr;
      stylistNameById = new Map(
        (stylistsData ?? []).map((s: any) => [s.stylist_id, s.name as string])
      );
    }

    // --- Plans (use the correct package column) + allow multiple rows
    const { data: plans, error: planErr } = await supabase
      .from(TBL_APPT_PLAN)
      .select(`appointment_id,service_id,${COL_PACKAGE_ID}`)
      .in("appointment_id", apptIds);
    if (planErr) throw planErr;

    const svcIds = new Set<string>();
    const pkgIds = new Set<string>();
    const apptPlanRef = new Map<
      string,
      { service_ids: string[]; package_ids: string[] }
    >();
    for (const p of plans ?? []) {
      const ref = apptPlanRef.get(p.appointment_id) ?? {
        service_ids: [],
        package_ids: [],
      };
      if (p.service_id) {
        ref.service_ids.push(p.service_id);
        svcIds.add(p.service_id);
      }
      const pkgId = (p as any)[COL_PACKAGE_ID] as string | null;
      if (pkgId) {
        ref.package_ids.push(pkgId);
        pkgIds.add(pkgId);
      }
      apptPlanRef.set(p.appointment_id, ref);
    }

    let svcById = new Map<
      string,
      { name: string; min_price?: number | null; max_price?: number | null }
    >();
    if (svcIds.size > 0) {
      const { data: svcData, error: svcErr } = await supabase
        .from("Services")
        .select("service_id,name,min_price,max_price")
        .in("service_id", Array.from(svcIds));
      if (svcErr) throw svcErr;
      svcById = new Map(
        (svcData ?? []).map((s: any) => [
          s.service_id,
          {
            name: s.name as string,
            min_price: s.min_price,
            max_price: s.max_price,
          },
        ])
      );
    }

    let pkgById = new Map<string, { name: string; price?: number | null }>();
    if (pkgIds.size > 0) {
      const { data: pkgData, error: pkgErr } = await supabase
        .from("Package")
        .select("package_id,name,price")
        .in("package_id", Array.from(pkgIds));
      if (pkgErr) throw pkgErr;
      pkgById = new Map(
        (pkgData ?? []).map((p: any) => [
          p.package_id,
          { name: p.name as string, price: p.price },
        ])
      );
    }

    const norm: AdminAppt[] = appts.map((a) => {
      // ✅ status normalization — keep Ongoing so UI stays pink on refresh
      const rawLower = String(a.status ?? "").toLowerCase();
      const status: AdminAppt["status"] = /cancel/.test(rawLower)
        ? "Cancelled"
        : /complete/.test(rawLower)
        ? "Completed"
        : /ongoing|on-going/.test(rawLower)
        ? "Ongoing"
        : !a.customer_id
        ? "Walk-In"
        : "Booked";

      // ALL stylists, joined
      const sids = apptToStylistIds.get(a.appointment_id) ?? [];
      const stylistNames = sids
        .map((id) => stylistNameById.get(id))
        .filter(Boolean) as string[];
      const stylist = stylistNames.length ? stylistNames.join(", ") : "—";

      // ALL plans, joined (services + packages)
      const ref = apptPlanRef.get(a.appointment_id) ?? {
        service_ids: [],
        package_ids: [],
      };
      const planNames: string[] = [
        ...(ref.service_ids
          .map((id) => svcById.get(id)?.name)
          .filter(Boolean) as string[]),
        ...(ref.package_ids
          .map((id) => pkgById.get(id)?.name)
          .filter(Boolean) as string[]),
      ];
      const plan = planNames.length ? planNames.join(", ") : "—";

      // prefer stored total; otherwise estimate
      let price = Number(a.total_amount ?? 0) || 0;
      if (!price) {
        const svcEst = ref.service_ids
          .map((id) => svcById.get(id))
          .reduce(
            (sum, m) =>
              sum +
              (Number(m?.min_price ?? 0) || Number(m?.max_price ?? 0) || 0),
            0
          );
        const pkgEst = ref.package_ids
          .map((id) => Number(pkgById.get(id)?.price ?? 0))
          .reduce((s, n) => s + n, 0);
        price = svcEst + pkgEst;
      }

      const customer = a.customer_id ? "Customer" : "Walk-In";

      return {
        id: a.appointment_id,
        date: a.date,
        start: String(a.expectedStart_time).slice(0, 5),
        end: String(a.expectedEnd_time).slice(0, 5),
        customer,
        plan,
        stylist,
        status,
        price,
        customer_id: a.customer_id ?? null,
      };
    });

    norm.sort((x, y) =>
      `${x.date} ${x.start}`.localeCompare(`${y.date} ${y.start}`)
    );

    return norm;
  }, []);

  /* ----------------- Admin: History (paginated table) --------------- */
  async function loadAdminAppointmentHistory(opts: {
    page: number; // 1-based
    pageSize: number;
    search?: string; // matches customer/stylist/notes/etc.
  }): Promise<{ items: HistoryRow[]; total: number }> {
    const { page, pageSize, search } = opts;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const allowedStatus = ["Completed", "Cancelled", "completed", "cancelled"];
    let base = supabase
      .from("Appointments")
      .select(
        "appointment_id,date,status,total_amount,comments,customer_id,display",
        { count: "exact" }
      )
      .eq("display", true)
      .in("status", allowedStatus)
      .order("date", { ascending: false })
      .range(from, to);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      base = base.or(`status.ilike.${term},comments.ilike.${term}`);
    }

    const { data: pageRows, error, count } = await base;
    if (error) throw error;

    const itemsBase = pageRows ?? [];

    // Collect IDs for joins
    const apptIds = itemsBase.map((r) => r.appointment_id);
    const customerIds = Array.from(
      new Set(itemsBase.map((r) => r.customer_id).filter(Boolean) as string[])
    );

    // Appointment → stylist link (singular AppointmentStylists)
    const { data: links, error: linkErr } = await supabase
      .from(TBL_APPT_STYLIST)
      .select("appointment_id,stylist_id")
      .in("appointment_id", apptIds);
    if (linkErr) throw linkErr;

    const stylistIds = Array.from(
      new Set(
        (links ?? []).map((l) => l.stylist_id).filter(Boolean) as string[]
      )
    );

    // Load stylist names
    let stylistNameById = new Map<string, string>();
    if (stylistIds.length) {
      const { data: stylists, error: sErr } = await supabase
        .from("Stylists")
        .select("stylist_id,name")
        .in("stylist_id", stylistIds);
      if (sErr) throw sErr;
      stylistNameById = new Map(
        (stylists ?? []).map((s: any) => [s.stylist_id, s.name as string])
      );
    }

    // Load customer names (first/middle/last)
    let customerNameById = new Map<string, string>();
    if (customerIds.length) {
      const { data: customers, error: cErr } = await supabase
        .from("Customers")
        .select("customer_id,firstName,middleName,lastName")
        .in("customer_id", customerIds);
      if (cErr) throw cErr;

      customerNameById = new Map(
        (customers ?? []).map((c: any) => [
          c.customer_id,
          buildCustomerName({
            firstName: c.firstName,
            middleName: c.middleName,
            lastName: c.lastName,
          }) ?? "",
        ])
      );
    }

    // If search includes a person name, match on computed names too
    let filteredRows = itemsBase;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const hasNameHit = (r: any) => {
        const cust = r.customer_id ? customerNameById.get(r.customer_id) : null;
        const link = (links ?? []).find(
          (l) => l.appointment_id === r.appointment_id
        );
        const sty = link?.stylist_id
          ? (stylistNameById.get(link.stylist_id) as string | undefined)
          : null;
        return (
          (cust ?? "").toLowerCase().includes(q) ||
          (sty ?? "").toLowerCase().includes(q)
        );
      };
      filteredRows = filteredRows.filter((r) => {
        const statusHit =
          String(r.status ?? "")
            .toLowerCase()
            .includes(q) ||
          String(r.comments ?? "")
            .toLowerCase()
            .includes(q);
        return statusHit || hasNameHit(r);
      });
    }

    // Map to HistoryRow
    const items: HistoryRow[] = filteredRows.map((r: any) => {
      const link = (links ?? []).find(
        (l) => l.appointment_id === r.appointment_id
      );
      const stylistName = link?.stylist_id
        ? (stylistNameById.get(link.stylist_id) as string | undefined) ?? null
        : null;

      const customerName = r.customer_id
        ? customerNameById.get(r.customer_id) || null
        : null;

      const note =
        r.customer_id == null ? "Walk-In" : r.comments ?? "Booked Online";

      // Normalize status for UI
      const statusRaw: string = r.status ?? "";
      const status = /complete/i.test(statusRaw)
        ? "Completed"
        : /cancel/i.test(statusRaw)
        ? "Cancelled"
        : /ongoing|on-going/i.test(statusRaw)
        ? "Ongoing"
        : /book|confirm/i.test(statusRaw)
        ? "Booked"
        : statusRaw;

      return {
        id: r.appointment_id,
        customer_name: customerName,
        stylist_name: stylistName,
        service_date: r.date,
        status: status as HistoryRow["status"],
        total_amount: r.total_amount ?? null,
        notes: note,
        customer_id: r.customer_id ?? null,
      };
    });

    return { items, total: count ?? items.length };
  }

  // useAppointments.ts
  const loadUpcomingCustomerAppointments = useCallback(
    async (customer_id: string) => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("Appointments")
        .select(
          "appointment_id,date,expectedStart_time,expectedEnd_time,status,display"
        )
        .eq("customer_id", customer_id)
        .eq("display", true)
        .eq("status", "Booked") // ← key line
        .gte("date", todayISO)
        .order("date", { ascending: true })
        .order("expectedStart_time", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    []
  );

  /* ------------------------------ Return ------------------------------ */
  return {
    services,
    packages,
    loadServices,
    loadPackages,
    getPlanOptionsForStylist,
    getAvailableTimeSlots,
    createAppointment,
    updateAppointment,
    updateAppointmentDetails,
    softDeleteAppointment,
    loadUpcomingCustomerAppointments,

    // Discounts
    canUseDiscount,
    filterEligibleDiscountsForCustomer,

    // Admin helpers
    loadUpcomingAdminAppointments,
    loadAdminAppointmentHistory,
  };
}

export default useAppointments;
