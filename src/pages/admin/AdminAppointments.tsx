import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowUpFromLine,
  X,
} from "lucide-react";
import BookAppointments from "@/public-components/BookAppointments";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import AdminAppointmentHistory from "./AdminAppointmentHistory";
import useServicesAndStylists from "@/features/servicesAndStylist/hooks/useServicesAndStylist";
import { supabase } from "@/lib/supabaseclient";
import { useFeedbackContext } from "@/features/feedback/context/FeedbackContext";
import useAuth from "@/features/auth/hooks/UseAuth";

/* ---------------------- Types ---------------------- */
type Status = "Completed" | "Booked" | "Ongoing" | "Walk-In" | "Cancelled";

type Appt = {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM (24h)
  end: string; // HH:MM
  customer: string;
  plan: string;
  stylist: string; // joined list: "A, B"
  status: Status;
  price: number;
  products?: string[];
  discountName?: string | null;
  customer_id?: string | null;
  /** Read-only notes from DB */
  comments?: string | null;
};

type DiscountMeta = {
  id: string;
  label: string; // UI label
  amountOff: number; // fixed ₱ off
  percentOff: number; // 0–100
};

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtTime = (hhmm?: string | null) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")}${ampm}`;
};

const to24From12 = (hour12: string, minute: string, ampm: "AM" | "PM") => {
  let h = Number(hour12);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${minute}`;
};

const to12From24 = (
  hhmm?: string | null
): { h: string; m: string; ap: "AM" | "PM" } => {
  if (!hhmm) return { h: "12", m: "00", ap: "AM" };
  const [hStr, m] = hhmm.split(":");
  let h = Number(hStr);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { h: String(h).padStart(2, "0"), m: m ?? "00", ap };
};

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};
const cmpHHMM = (a: string, b: string) => (a === b ? 0 : a < b ? -1 : 1);

function addDaysISO(d: Date, add: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + add);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(x.getDate()).padStart(2, "0")}`;
}

// 3-week scaffold (Mon–Sat only)
function useThreeWeekMonSat() {
  const start = React.useMemo(() => new Date(), []);
  const days = React.useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 21; i++) {
      const iso = addDaysISO(start, i);
      const dt = new Date(iso);
      const dow = dt.getDay(); // 0 Sun .. 6 Sat
      if (dow >= 1 && dow <= 6) arr.push(iso);
    }
    return arr;
  }, [start]);
  return { days };
}

/* --------------------------- Modals --------------------------- */

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header pinned with glass effect */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <button
            className="rounded-full p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content, capped height */}
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

/** Reusable confirmation modal */
function ConfirmModal({
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onCancel,
  onConfirm,
}: {
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger" | "success";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmClasses =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : tone === "success"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : "bg-amber-400 hover:bg-amber-500 text-black";

  return (
    <ModalShell title={title} onClose={onCancel}>
      <div className="space-y-6">
        {description ? (
          <div className="text-zinc-700">{description}</div>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl bg-zinc-100 px-5 py-2 font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-xl px-5 py-2 font-semibold shadow-sm ${confirmClasses}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* -------------------- View (READ-ONLY) Modal -------------------- */
function ViewDetailsModal({
  appt,
  onClose,
}: {
  appt: Appt;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [isCustomerAccount, setIsCustomerAccount] = useState<boolean>(
    !!appt.customer_id
  );
  const [customerDisplayName, setCustomerDisplayName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("—");
  const [actualStart, setActualStart] = useState<string | null>(null);
  const [actualEnd, setActualEnd] = useState<string | null>(null);

  // Products used (names only)
  const [productsUsed, setProductsUsed] = useState<
    { product_id: string; name: string }[]
  >([]);

  // Applied discounts (detailed)
  const [appliedDiscounts, setAppliedDiscounts] = useState<
    { id: string; label: string; amountOff: number; percentOff: number }[]
  >([]);

  // Fresh notes for view
  const [comments, setComments] = useState<string>(appt.comments || "");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Read latest values including actual times + comments
        const { data: aRow, error: aErr } = await supabase
          .from("Appointments")
          .select(
            "customer_id, firstName, middleName, lastName, payment_method, time_started, time_ended, comments"
          )
          .eq("appointment_id", appt.id)
          .single();

        if (aErr) throw aErr;

        if (!cancelled) {
          setPaymentMethod(aRow?.payment_method ?? "—");
          setActualStart(aRow?.time_started ?? null);
          setActualEnd(aRow?.time_ended ?? null);
          setComments(aRow?.comments ?? appt.comments ?? "");
        }

        const cid: string | null = aRow?.customer_id ?? null;

        if (cid) {
          const { data: cRow, error: cErr } = await supabase
            .from("Customers")
            .select("firstName, middleName, lastName")
            .eq("customer_id", cid)
            .single();
          if (cErr) throw cErr;

          const full = [cRow?.firstName, cRow?.middleName, cRow?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          if (!cancelled) {
            setIsCustomerAccount(true);
            setCustomerDisplayName(full || "Customer");
          }
        } else {
          const full = [aRow?.firstName, aRow?.middleName, aRow?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          if (!cancelled) {
            setIsCustomerAccount(false);
            setCustomerDisplayName(full || "Walk-In");
          }
        }

        // Fetch products used
        const { data: prodLinks, error: linkErr } = await supabase
          .from("AppointmentProducts")
          .select("product_id, Products(name)")
          .eq("appointment_id", appt.id);
        if (linkErr) throw linkErr;

        const normalized =
          (prodLinks ?? []).map((r: any) => ({
            product_id: r.product_id as string,
            name: (r?.Products?.name as string) ?? "Unknown",
          })) ?? [];

        if (!cancelled) setProductsUsed(normalized);

        // Fetch applied discounts
        const { data: discLinks, error: discErr } = await supabase
          .from("AppointmentDiscount")
          .select("discount_id, Discounts(name, type, value)")
          .eq("appointment_id", appt.id);
        if (discErr) throw discErr;

        const norms =
          (discLinks ?? [])
            .map((r: any) => {
              const t = String(r?.Discounts?.type ?? "").toLowerCase();
              const valNum = Number(r?.Discounts?.value ?? 0) || 0;
              const isPercent = /percent/.test(t);
              return {
                id: String(r.discount_id),
                label:
                  (r?.Discounts?.name as string)?.trim() ||
                  (isPercent
                    ? `${valNum}% off`
                    : `₱${valNum.toLocaleString("en-PH")} off`),
                amountOff: isPercent ? 0 : Math.max(0, valNum),
                percentOff: isPercent ? Math.max(0, valNum) : 0,
              };
            })
            .filter((x: any) => x.amountOff > 0 || x.percentOff > 0) ?? [];

        if (!cancelled) setAppliedDiscounts(norms);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appt.id, appt.comments]);

  const peso = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const discountSummary = appliedDiscounts.length
    ? appliedDiscounts
        .map((d) =>
          d.percentOff
            ? `${d.label} (${d.percentOff}% off)`
            : `${d.label} (₱${d.amountOff.toLocaleString("en-PH")} off)`
        )
        .join(", ")
    : "—";

  return (
    <ModalShell title="View Service Transaction Details" onClose={onClose}>
      {/* Times: Expected vs Actual */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ModernField label="Booked Starting Time" value={fmtTime(appt.start)} />
        <ModernField label="Expected Ending Time" value={fmtTime(appt.end)} />
        <ModernField
          label="Time Started (Actual)"
          value={fmtTime(actualStart)}
        />
        <ModernField label="Time Ended (Actual)" value={fmtTime(actualEnd)} />
      </div>

      {/* Read-only details */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ModernBox label="Stylists">
          <div className="text-sm">{appt.stylist || "—"}</div>
        </ModernBox>

        <ModernBox label="Customer Name">
          {loading ? (
            <span className="text-sm text-zinc-500">Loading…</span>
          ) : err ? (
            <span className="text-sm text-rose-600">{err}</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm">
              {customerDisplayName || appt.customer || "—"}
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                {isCustomerAccount ? "Customer Account" : "Walk-In"}
              </span>
            </span>
          )}
        </ModernBox>

        <ModernBox label="Plans (Services & Packages)" wide>
          <div className="text-sm">{appt.plan || "—"}</div>
        </ModernBox>

        <ModernField label="Status" value={appt.status} />
        <ModernField
          label="Payment Method"
          value={loading ? "Loading…" : paymentMethod || "—"}
        />
        <ModernField
          label="Total Amount"
          valueClass="text-lg font-semibold"
          value={peso(appt.price || 0)}
        />
        <ModernBox label="Applied Discounts">
          <div className="text-sm">
            {loading ? "Loading…" : discountSummary}
          </div>
        </ModernBox>

        <ModernBox label="Products Used" wide>
          {loading ? (
            <div className="text-sm text-zinc-500">Loading…</div>
          ) : productsUsed.length ? (
            <ul className="list-disc pl-5 text-sm">
              {productsUsed.map((p) => (
                <li key={p.product_id}>{p.name}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-zinc-500">—</div>
          )}
        </ModernBox>

        <ModernBox label="Customer Notes" wide>
          <div className="text-sm">
            {loading ? "Loading…" : comments?.trim() || "—"}
          </div>
        </ModernBox>
      </div>
    </ModalShell>
  );
}

/* -------------------- Modify (READ-ONLY notes) Modal -------------------- */
function ModifyDetailsModal({
  appt,
  onClose,
  onSave,
}: {
  appt: Appt;
  onClose: () => void;
  onSave: (patch: Partial<Appt>) => void;
}) {
  const { stylists } = useServicesAndStylists();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const {
    services: svcList,
    packages: pkgList,
    loadServices,
    loadPackages,
    updateAppointmentDetails,
    updateAppointment,
    filterEligibleDiscountsForCustomer,
  } = useAppointments();

  useEffect(() => {
    if (!svcList.length) void loadServices();
    if (!pkgList.length) void loadPackages();
  }, [svcList.length, pkgList.length, loadServices, loadPackages]);

  /* ----- Customer name handling ----- */
  const [isCustomerAccount, setIsCustomerAccount] = useState<boolean>(
    !!appt.customer_id
  );
  const [custLoading, setCustLoading] = useState(true);
  const [custErr, setCustErr] = useState<string | null>(null);
  const [customerDisplayName, setCustomerDisplayName] = useState<string>(
    appt.customer || ""
  );
  const [walkFirst, setWalkFirst] = useState("");
  const [walkMiddle, setWalkMiddle] = useState("");
  const [walkLast, setWalkLast] = useState("");

  /* ----- actual start/end time state + loader from DB ----- */
  const startDefaults = to12From24(appt.start);
  const endDefaults = to12From24(appt.end);

  const [startH, setStartH] = useState(startDefaults.h);
  const [startM, setStartM] = useState(startDefaults.m);
  const [startAP, setStartAP] = useState<"AM" | "PM">(startDefaults.ap);

  const [endH, setEndH] = useState(endDefaults.h);
  const [endM, setEndM] = useState(endDefaults.m);
  const [endAP, setEndAP] = useState<"AM" | "PM">(endDefaults.ap);

  /* ----- Products state (names only) ----- */
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsErr, setProductsErr] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  /* ----- Discounts (via DiscountServices junction) ----- */
  const [eligibleDiscounts, setEligibleDiscounts] = useState<DiscountMeta[]>(
    []
  );
  const [selectedDiscountIds, setSelectedDiscountIds] = useState<string[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [discountsErr, setDiscountsErr] = useState<string | null>(null);

  const [preAppliedDiscounts, setPreAppliedDiscounts] = useState<
    DiscountMeta[]
  >([]);
  const [userToggledDiscounts, setUserToggledDiscounts] = useState(false);

  // READ-ONLY notes for edit modal
  const [comments, setComments] = useState<string>(appt.comments || "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCustLoading(true);
        setCustErr(null);

        const { data: aRow, error: aErr } = await supabase
          .from("Appointments")
          .select(
            "customer_id, firstName, middleName, lastName, time_started, time_ended, comments"
          )
          .eq("appointment_id", appt.id)
          .single();
        if (aErr) throw aErr;

        const s12 = to12From24(aRow?.time_started ?? appt.start);
        const e12 = to12From24(aRow?.time_ended ?? appt.end);
        if (!cancelled) {
          setStartH(s12.h);
          setStartM(s12.m);
          setStartAP(s12.ap);
          setEndH(e12.h);
          setEndM(e12.m);
          setEndAP(e12.ap);
          setComments(aRow?.comments ?? appt.comments ?? "");
        }

        const cid: string | null = aRow?.customer_id ?? null;

        if (cid) {
          const { data: cRow, error: cErr } = await supabase
            .from("Customers")
            .select("firstName, middleName, lastName")
            .eq("customer_id", cid)
            .single();
          if (cErr) throw cErr;

          const name = [cRow?.firstName, cRow?.middleName, cRow?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          if (!cancelled) {
            setIsCustomerAccount(true);
            setCustomerDisplayName(name || "Customer");
          }
        } else {
          if (!cancelled) {
            setIsCustomerAccount(false);
            setWalkFirst(aRow?.firstName ?? "");
            setWalkMiddle(aRow?.middleName ?? "");
            setWalkLast(aRow?.lastName ?? "");
          }
        }
      } catch (e: any) {
        if (!custErr && !cancelled)
          setCustErr(e?.message || "Failed to load customer info.");
      } finally {
        if (!cancelled) setCustLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appt.id, appt.start, appt.end, appt.comments]);

  // Load product options + preselect already linked
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProductsLoading(true);
        setProductsErr(null);

        // fetch only displayed products
        const { data: prods, error: pErr } = await supabase
          .from("Products")
          .select("product_id, name")
          .or("isDisplay.is.true,isDisplay.is.null")
          .order("name", { ascending: true });

        if (pErr) throw pErr;

        if (!cancelled) {
          setProductOptions(
            (prods ?? []).map((p: any) => ({
              id: p.product_id as string,
              name: (p.name as string) ?? "Unnamed",
            }))
          );
        }

        const { data: links, error: linkErr } = await supabase
          .from("AppointmentProducts")
          .select("product_id")
          .eq("appointment_id", appt.id);

        if (linkErr) throw linkErr;

        if (!cancelled) {
          setSelectedProductIds(
            ((links ?? []).map((r: any) => r.product_id).filter(Boolean) ??
              []) as string[]
          );
        }
      } catch (e: any) {
        if (!cancelled)
          setProductsErr(e?.message || "Failed to load products.");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appt.id]);

  /* ----------------------- local state ----------------------- */
  const [payment, setPayment] = useState<"Cash" | "Card" | "GCash">("Cash");
  const [total, setTotal] = useState(appt.price || 0);
  const [discountName, setDiscountName] = useState(appt.discountName || "");

  // Selections
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<
    Array<{ type: "Service" | "Package"; id: string }>
  >([]);

  // NEW: applied prices keyed by plan
  type PlanKey = `${"Service" | "Package"}:${string}`;
  const [appliedPrices, setAppliedPrices] = useState<Record<PlanKey, number>>(
    {}
  );

  // Preselect stylists by name
  useEffect(() => {
    if (appt.stylist && stylists?.length) {
      const wanted = new Set(
        appt.stylist
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
      const ids = (stylists as any[])
        .filter((s: any) => wanted.has(String(s.name).trim()))
        .map((s: any) => String(s.stylist_id));
      if (ids.length) setSelectedStylistIds(ids);
    }
  }, [appt.stylist, stylists]);

  // Preselect plans by name
  useEffect(() => {
    if (!appt.plan || (!svcList.length && !pkgList.length)) return;
    const wanted = appt.plan
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const picks: Array<{ type: "Service" | "Package"; id: string }> = [];

    for (const name of wanted) {
      const svc = (svcList as any[]).find(
        (s: any) => String(s.name).trim() === name
      );
      if (svc?.service_id) {
        picks.push({ type: "Service", id: String(svc.service_id) });
        continue;
      }
      const pkg = (pkgList as any[]).find(
        (p: any) => String(p.name).trim() === name
      );
      if (pkg?.package_id) {
        picks.push({ type: "Package", id: String(pkg.package_id) });
      }
    }

    if (picks.length) setSelectedPlans(picks);
  }, [appt.plan, svcList, pkgList]);

  // NEW: hydrate previously applied prices from AppointmentServicePlan
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("AppointmentServicePlan")
          .select("service_id, package_id, appliedPrice")
          .eq("appointment_id", appt.id);

        if (error) throw error;

        const map: Record<PlanKey, number> = {};
        for (const row of data ?? []) {
          const sid = row.service_id ? String(row.service_id) : null;
          const pid = row.package_id ? String(row.package_id) : null;
          const key: PlanKey = sid
            ? (`Service:${sid}` as unknown as PlanKey)
            : (`Package:${pid}` as unknown as PlanKey);
          map[key] = Number(row.appliedPrice ?? 0) || 0;
        }
        if (!cancelled) setAppliedPrices(map);
      } catch (e) {
        console.error("Failed to load applied prices:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appt.id]);

  // Options with numeric price (for totals)
  const planOptions = useMemo(
    () => [
      ...(svcList || []).map((s: any) => {
        const raw = s.price ?? s.min_price ?? s.max_price ?? 0;
        const price = Number(raw) || 0;
        return {
          type: "Service" as const,
          id: String(s.service_id),
          name: String(s.name),
          duration: Number(s.duration ?? 0) || 0,
          price,
          priceLabel: price ? `₱${price.toLocaleString("en-PH")}` : undefined,
        };
      }),
      ...(pkgList || []).map((p: any) => {
        const price = Number(p.price ?? 0) || 0;
        return {
          type: "Package" as const,
          id: String(p.package_id),
          name: String(p.name),
          duration: Number(p.expected_duration ?? 0) || 0,
          price,
          priceLabel: price ? `₱${price.toLocaleString("en-PH")}` : undefined,
        };
      }),
    ],
    [svcList, pkgList]
  );

  const toggleStylist = (id: string) => {
    setSelectedStylistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isPlanChecked = (t: "Service" | "Package", id: string) =>
    selectedPlans.some((p) => p.type === t && p.id === id);

  const togglePlan = (t: "Service" | "Package", id: string) => {
    setSelectedPlans((prev) => {
      const exists = prev.some((p) => p.type === t && p.id === id);
      if (exists) return prev.filter((p) => !(p.type === t && p.id === id));
      return [...prev, { type: t, id }];
    });
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleDiscount = (id: string) => {
    setUserToggledDiscounts(true);
    setSelectedDiscountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Subtotal from selected plans (prefer appliedPrices, fallback to planOptions price)
  const subtotal = useMemo(() => {
    if (!selectedPlans.length) return 0;

    type PlanKey = `${"Service" | "Package"}:${string}`;
    const priceMap = new Map<PlanKey, number>();
    for (const o of planOptions) {
      const k = `${o.type}:${o.id}` as PlanKey;
      priceMap.set(k, Number(o.price || 0));
    }

    return selectedPlans.reduce((sum, p) => {
      const key = `${p.type}:${p.id}` as PlanKey;
      const applied = Number(appliedPrices[key] ?? 0);
      const base = Number(priceMap.get(key) ?? 0);
      return sum + (applied > 0 ? applied : base);
    }, 0);
  }, [selectedPlans, planOptions, appliedPrices]);

  const selectedServiceIds = useMemo(
    () => selectedPlans.filter((p) => p.type === "Service").map((p) => p.id),
    [selectedPlans]
  );
  const selectedPackageIds = useMemo(
    () => selectedPlans.filter((p) => p.type === "Package").map((p) => p.id),
    [selectedPlans]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setDiscountsLoading(true);
        setDiscountsErr(null);

        if (
          selectedServiceIds.length === 0 &&
          selectedPackageIds.length === 0
        ) {
          if (!cancelled) {
            setEligibleDiscounts([]);
          }
          return;
        }

        const orParts: string[] = [];
        if (selectedServiceIds.length) {
          orParts.push(`service_id.in.(${selectedServiceIds.join(",")})`);
        }
        if (selectedPackageIds.length) {
          orParts.push(`package_id.in.(${selectedPackageIds.join(",")})`);
        }

        const { data: linkRows, error: linkErr } = await supabase
          .from("DiscountServices")
          .select("discount_id, service_id, package_id")
          .or(orParts.join(","));

        if (linkErr) throw linkErr;

        const discountIds = Array.from(
          new Set(
            (linkRows ?? []).map((r: any) => r.discount_id).filter(Boolean)
          )
        ) as string[];

        if (!discountIds.length) {
          if (!cancelled) setEligibleDiscounts([]);
          return;
        }

        const { data: discRows, error: discErr } = await supabase
          .from("Discounts")
          .select(
            "discount_id, name, type, value, start_date, end_date, status, display, amount_of_uses"
          )
          .in("discount_id", discountIds)
          .eq("display", true);

        if (discErr) throw discErr;

        const apptDate = appt.date;
        const withinDate = (d: any) => {
          const s = d.start_date ? String(d.start_date) : null;
          const e = d.end_date ? String(d.end_date) : null;
          const afterStart = !s || apptDate >= s;
          const beforeEnd = !e || apptDate <= e;
          return afterStart && beforeEnd;
        };
        const isActive = (d: any) =>
          !d.status || /^active$/i.test(String(d.status));

        const applicable = (discRows ?? []).filter(
          (r) => withinDate(r) && isActive(r)
        );

        const allowedIds = await filterEligibleDiscountsForCustomer(
          applicable.map((r) => r.discount_id),
          appt.customer_id ?? null,
          isAdmin
        );

        const ok = applicable.filter((r) => allowedIds.includes(r.discount_id));

        const toNumber = (v: any) =>
          Number.isFinite(Number(v)) ? Number(v) : 0;

        const norm: DiscountMeta[] = ok
          .map((r) => {
            const t = String(r.type ?? "").toLowerCase();
            const val = toNumber(r.value);
            const isPercent = /percent/.test(t);
            const amountOff = isPercent ? 0 : Math.max(0, val);
            const percentOff = isPercent ? Math.max(0, val) : 0;

            const parts: string[] = [];
            if (percentOff) parts.push(`${percentOff}% off`);
            if (amountOff)
              parts.push(`₱${amountOff.toLocaleString("en-PH")} off`);
            const fallback = parts.join(" + ") || "Discount";
            const label = String(r.name ?? "").trim() || fallback;

            return {
              id: r.discount_id as string,
              label,
              amountOff,
              percentOff,
            };
          })
          .filter((d) => d.amountOff > 0 || d.percentOff > 0);

        if (!cancelled) setEligibleDiscounts(norm);
      } catch (e: any) {
        if (!cancelled)
          setDiscountsErr(e?.message || "Failed to load discounts.");
      } finally {
        if (!cancelled) setDiscountsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedServiceIds,
    selectedPackageIds,
    appt.date,
    appt.customer_id,
    filterEligibleDiscountsForCustomer,
    isAdmin,
  ]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("AppointmentDiscount")
          .select("discount_id")
          .eq("appointment_id", appt.id);

        if (error) throw error;

        const existingIds = (data ?? [])
          .map((r: any) => String(r.discount_id))
          .filter(Boolean);

        if (cancelled) return;

        let preAppliedMeta: DiscountMeta[] = [];
        if (existingIds.length) {
          const { data: discRows, error: discErr } = await supabase
            .from("Discounts")
            .select("discount_id, name, type, value")
            .in("discount_id", existingIds);

          if (discErr) throw discErr;

          const toNumber = (v: any) =>
            Number.isFinite(Number(v)) ? Number(v) : 0;

          preAppliedMeta =
            (discRows ?? [])
              .map((r: any) => {
                const t = String(r.type ?? "").toLowerCase();
                const val = toNumber(r.value);
                const isPercent = /percent/.test(t);
                const amountOff = isPercent ? 0 : Math.max(0, val);
                const percentOff = isPercent ? Math.max(0, val) : 0;

                const parts: string[] = [];
                if (percentOff) parts.push(`${percentOff}% off`);
                if (amountOff)
                  parts.push(`₱${amountOff.toLocaleString("en-PH")} off`);
                const fallback = parts.join(" + ") || "Discount";
                const label = String(r.name ?? "").trim() || fallback;

                return {
                  id: String(r.discount_id),
                  label,
                  amountOff,
                  percentOff,
                };
              })
              .filter((d) => d.amountOff > 0 || d.percentOff > 0) ?? [];
        }

        setPreAppliedDiscounts(preAppliedMeta);

        setSelectedDiscountIds((prev) => {
          if (prev.length > 0 && userToggledDiscounts) return prev;
          return existingIds;
        });
      } catch (e) {
        console.error("Failed to preselect/describe applied discounts:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appt.id, userToggledDiscounts]);

  const computedTotal = useMemo(() => {
    const eligibleMap = new Map(eligibleDiscounts.map((d) => [d.id, d]));
    const combined = new Map<string, DiscountMeta>(eligibleMap);
    for (const d of preAppliedDiscounts) {
      if (!combined.has(d.id)) combined.set(d.id, d);
    }

    const chosen = selectedDiscountIds
      .map((id) => combined.get(id))
      .filter(Boolean) as DiscountMeta[];

    if (!chosen.length) return subtotal;

    const sumPercent = Math.min(
      100,
      chosen.reduce((s, d) => s + (d.percentOff || 0), 0)
    );
    const percentOffValue = (subtotal * sumPercent) / 100;

    const sumAmount = chosen.reduce((s, d) => s + (d.amountOff || 0), 0);

    const totalAfter = Math.max(0, subtotal - percentOffValue - sumAmount);
    return totalAfter;
  }, [eligibleDiscounts, preAppliedDiscounts, selectedDiscountIds, subtotal]);

  useEffect(() => {
    setTotal(computedTotal);
  }, [computedTotal]);

  const peso = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  // Persist WITHOUT touching comments (read-only)
  const persist = async () => {
    // Save walk-in names into Appointments
    if (!isCustomerAccount) {
      await updateAppointment(appt.id, {
        firstName: walkFirst.trim() || null,
        middleName: walkMiddle.trim() || null,
        lastName: walkLast.trim() || null,
      } as any);
    }

    // Save actual times only (no comments)
    const time_started = to24From12(startH, startM, startAP);
    const time_ended = to24From12(endH, endM, endAP);

    await updateAppointment(appt.id, {
      time_started,
      time_ended,
    } as any);

    // Update amount/payment + stylists/plans (no price here)
    await updateAppointmentDetails({
      appointment_id: appt.id,
      stylist_ids: selectedStylistIds,
      plans: selectedPlans,
      total_amount: total,
      payment_method: payment,
    });

    // Replace AppointmentServicePlan rows with appliedPrice values
    {
      const del = await supabase
        .from("AppointmentServicePlan")
        .delete()
        .eq("appointment_id", appt.id);
      if (del.error) throw del.error;

      if (selectedPlans.length) {
        const rows = selectedPlans.map((p) => {
          const key = `${p.type}:${p.id}` as `${
            | "Service"
            | "Package"}:${string}`;
          const applied = Number(appliedPrices[key] ?? 0) || null;
          return p.type === "Service"
            ? {
                appointment_id: appt.id,
                service_id: p.id,
                package_id: null,
                appliedPrice: applied,
              }
            : {
                appointment_id: appt.id,
                service_id: null,
                package_id: p.id,
                appliedPrice: applied,
              };
        });

        const ins = await supabase.from("AppointmentServicePlan").insert(rows);
        if (ins.error) throw ins.error;
      }
    }

    // Replace AppointmentProducts with current selection
    const delProducts = await supabase
      .from("AppointmentProducts")
      .delete()
      .eq("appointment_id", appt.id);
    if (delProducts.error) throw delProducts.error;

    if (selectedProductIds.length) {
      const rows = selectedProductIds.map((pid) => ({
        appointment_id: appt.id,
        product_id: pid,
      }));
      const ins = await supabase.from("AppointmentProducts").insert(rows);
      if (ins.error) throw ins.error;
    }

    // Replace AppointmentDiscount with current selection
    const delDisc = await supabase
      .from("AppointmentDiscount")
      .delete()
      .eq("appointment_id", appt.id);
    if (delDisc.error) throw delDisc.error;

    if (selectedDiscountIds.length) {
      const rows = selectedDiscountIds.map((did) => ({
        appointment_id: appt.id,
        discount_id: did,
      }));
      const ins = await supabase.from("AppointmentDiscount").insert(rows);
      if (ins.error) throw ins.error;
    }

    // Patch UI (comments stay as-is)
    const stylistNames =
      (stylists as any[])
        ?.filter((s: any) => selectedStylistIds.includes(String(s.stylist_id)))
        ?.map((s: any) => s.name) ?? [];
    const planNames = selectedPlans
      .map((sel) => {
        const meta = planOptions.find(
          (o) => o.type === sel.type && o.id === sel.id
        );
        return meta?.name;
      })
      .filter(Boolean) as string[];

    const newCustomerDisplay = isCustomerAccount
      ? customerDisplayName || appt.customer
      : [walkFirst, walkMiddle, walkLast].filter(Boolean).join(" ").trim();

    onSave({
      price: total,
      discountName:
        eligibleDiscounts
          .filter((d) => selectedDiscountIds.includes(d.id))
          .map((d) => d.label)
          .join(", ") || null,
      stylist: stylistNames.length ? stylistNames.join(", ") : appt.stylist,
      plan: planNames.length ? planNames.join(", ") : appt.plan,
      customer: newCustomerDisplay || appt.customer,
      // comments untouched (read-only)
    });
  };

  // Display list of discounts (eligible + pre-applied-not-eligible)
  const eligibleIds = new Set(eligibleDiscounts.map((d) => d.id));
  const preAppliedOnly = preAppliedDiscounts.filter(
    (d) => !eligibleIds.has(d.id)
  );

  const displayDiscounts: Array<DiscountMeta & { nowIneligible?: boolean }> = [
    ...eligibleDiscounts.map((d) => ({ ...d, nowIneligible: false })),
    ...preAppliedOnly.map((d) => ({ ...d, nowIneligible: true })),
  ];

  useEffect(() => {
    const all = new Map<string, string>();
    for (const d of eligibleDiscounts) all.set(d.id, d.label);
    for (const d of preAppliedDiscounts)
      if (!all.has(d.id)) all.set(d.id, d.label);

    const label = selectedDiscountIds
      .map((id) => all.get(id))
      .filter(Boolean)
      .join(", ");

    setDiscountName(label);
  }, [eligibleDiscounts, preAppliedDiscounts, selectedDiscountIds]);

  return (
    <ModalShell title="Modify Service Transaction Details" onClose={onClose}>
      {/* Times */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ModernField
          label="Expected Starting Time"
          value={fmtTime(appt.start)}
        />
        <ModernField label="Expected Ending Time" value={fmtTime(appt.end)} />

        {/* Actual: Time Started */}
        <div>
          <Label>Time Started</Label>
          <div className="flex gap-2">
            <Select value={startH} onChange={(e) => setStartH(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => {
                const hh = String(i + 1).padStart(2, "0");
                return (
                  <option key={hh} value={hh}>
                    {hh}
                  </option>
                );
              })}
            </Select>
            <Select value={startM} onChange={(e) => setStartM(e.target.value)}>
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select
              value={startAP}
              onChange={(e) => setStartAP(e.target.value as "AM" | "PM")}
            >
              <option>AM</option>
              <option>PM</option>
            </Select>
          </div>
          <Hint>
            Defaults to expected start if no actual time is saved yet.
          </Hint>
        </div>

        {/* Actual: Time Ended */}
        <div>
          <Label>Time Ended</Label>
          <div className="flex gap-2">
            <Select value={endH} onChange={(e) => setEndH(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => {
                const hh = String(i + 1).padStart(2, "0");
                return (
                  <option key={hh} value={hh}>
                    {hh}
                  </option>
                );
              })}
            </Select>
            <Select value={endM} onChange={(e) => setEndM(e.target.value)}>
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select
              value={endAP}
              onChange={(e) => setEndAP(e.target.value as "AM" | "PM")}
            >
              <option>AM</option>
              <option>PM</option>
            </Select>
          </div>
          <Hint>Defaults to expected end if no actual time is saved yet.</Hint>
        </div>
      </div>

      {/* Stylists, Plans, Products, Discounts */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Stylists checklist */}
        <ModernBox label="Stylists">
          <div className="max-h-64 overflow-auto md:max-h-80">
            {stylists?.length ? (
              <div className="grid grid-cols-1 gap-2">
                {stylists.map((s: any) => (
                  <label
                    key={s.stylist_id}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
                  >
                    <span className="text-sm">{s.name}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-300"
                      checked={selectedStylistIds.includes(
                        String(s.stylist_id)
                      )}
                      onChange={() => toggleStylist(String(s.stylist_id))}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No stylists found.</div>
            )}
          </div>
        </ModernBox>

        {/* Customer Name */}
        <ModernBox label="Customer Name">
          {custLoading ? (
            <div className="text-sm text-zinc-500">Loading…</div>
          ) : custErr ? (
            <div className="text-sm text-rose-600">{custErr}</div>
          ) : isCustomerAccount ? (
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none focus:ring-2 focus:ring-amber-200"
              value={customerDisplayName}
              readOnly
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                placeholder="First name"
                value={walkFirst}
                onChange={(e) => setWalkFirst(e.target.value)}
              />
              <Input
                placeholder="Middle name"
                value={walkMiddle}
                onChange={(e) => setWalkMiddle(e.target.value)}
              />
              <Input
                placeholder="Last name"
                value={walkLast}
                onChange={(e) => setWalkLast(e.target.value)}
              />
            </div>
          )}
        </ModernBox>

        {/* Plans + Products + Discounts */}
        <div className="md:col-span-2">
          <Label className="mb-2">Plans (Services & Packages)</Label>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Left: Plans with Applied Price editing */}
              <PlansColumn
                planOptions={planOptions}
                isPlanChecked={isPlanChecked}
                togglePlan={togglePlan}
                appliedPrices={appliedPrices}
                setAppliedPrice={(t, id, v) =>
                  setAppliedPrices((prev) => ({
                    ...prev,
                    [`${t}:${id}` as `${"Service" | "Package"}:${string}`]: v,
                  }))
                }
              />

              {/* Middle: Products Used */}
              <ProductsColumn
                productOptions={productOptions}
                productsLoading={productsLoading}
                productsErr={productsErr}
                selectedProductIds={selectedProductIds}
                toggleProduct={toggleProduct}
              />

              {/* Right: Discounts */}
              <DiscountsColumn
                discountsLoading={discountsLoading}
                discountsErr={discountsErr}
                displayDiscounts={displayDiscounts}
                selectedDiscountIds={selectedDiscountIds}
                toggleDiscount={toggleDiscount}
              />
            </div>
          </div>

          <Hint className="mt-2">
            Saving updates totals, payment, stylists/plans, products used,
            discounts, and actual start/end times. Customer Notes are read-only.
          </Hint>
        </div>

        {/* Totals */}
        <ModernField
          label="Items Subtotal"
          value={peso(subtotal)}
          valueClass="font-semibold"
        />
        <div>
          <Label>Total Amount</Label>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-right font-semibold outline-none focus:ring-2 focus:ring-amber-200"
            value={peso(total)}
            readOnly
          />
          <Hint>
            Auto-computed from selected Services/Packages (preferring Applied ₱)
            and discounts.
          </Hint>
        </div>

        <div>
          <Label>Payment Method</Label>
          <Select
            value={payment}
            onChange={(e) => setPayment(e.target.value as any)}
          >
            <option>Cash</option>
            <option>Card</option>
            <option>GCash</option>
          </Select>
        </div>

        {/* READ-ONLY Customer Notes */}
        <ModernBox label="Customer Notes" wide>
          <div className="min-h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
            {comments?.trim() || "—"}
          </div>
        </ModernBox>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          className="rounded-xl bg-zinc-100 px-5 py-2 font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-amber-400 px-5 py-2 font-semibold text-black shadow-sm ring-1 ring-amber-300 hover:bg-amber-500 active:scale-[0.99]"
          onClick={async () => {
            try {
              await persist();
              onClose();
            } catch (e) {
              console.error("Failed to save appointment edits:", e);
            }
          }}
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}

/* ---- Small column components to keep JSX tidy ---- */
function PlansColumn({
  planOptions,
  isPlanChecked,
  togglePlan,
  appliedPrices,
  setAppliedPrice,
}: {
  planOptions: Array<{
    type: "Service" | "Package";
    id: string;
    name: string;
    duration: number;
    price: number;
    priceLabel?: string;
  }>;
  isPlanChecked: (t: "Service" | "Package", id: string) => boolean;
  togglePlan: (t: "Service" | "Package", id: string) => void;
  appliedPrices: Record<string, number>;
  setAppliedPrice: (
    t: "Service" | "Package",
    id: string,
    value: number
  ) => void;
}) {
  return (
    <div className="max-h-64 space-y-2 overflow-auto p-3 md:max-h-80">
      {planOptions.length ? (
        planOptions.map((opt) => {
          const checked = isPlanChecked(opt.type, opt.id);
          const key = `${opt.type}:${opt.id}`;
          const currentApplied = appliedPrices[key] ?? 0;

          return (
            <div
              key={`${opt.type}-${opt.id}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
            >
              <label className="flex grow items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-300"
                  checked={checked}
                  onChange={() => togglePlan(opt.type, opt.id)}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {opt.name}{" "}
                    <span className="ml-1 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                      {opt.type}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {opt.duration ? `${opt.duration} min` : ""}
                    {opt.priceLabel ? ` • ${opt.priceLabel}` : ""}
                  </span>
                </div>
              </label>

              {/* Only show Applied ₱ when selected */}
              {checked && (
                <div className="w-28 shrink-0">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={currentApplied || ""}
                    onChange={(e) =>
                      setAppliedPrice(
                        opt.type,
                        opt.id,
                        Math.max(0, Number(e.target.value || 0))
                      )
                    }
                    placeholder="Applied ₱"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-sm text-zinc-500">
          Loading services & packages…
        </div>
      )}
    </div>
  );
}

function ProductsColumn({
  productOptions,
  productsLoading,
  productsErr,
  selectedProductIds,
  toggleProduct,
}: {
  productOptions: { id: string; name: string }[];
  productsLoading: boolean;
  productsErr: string | null;
  selectedProductIds: string[];
  toggleProduct: (id: string) => void;
}) {
  return (
    <div className="space-y-2 border-t p-3 md:border-l md:border-t-0">
      <div className="text-center text-sm font-semibold md:text-left">
        Products Used
      </div>

      {productsLoading ? (
        <div className="text-sm text-zinc-500">Loading…</div>
      ) : productsErr ? (
        <div className="text-sm text-rose-600">{productsErr}</div>
      ) : productOptions.length ? (
        <div className="max-h-64 space-y-2 overflow-auto md:max-h-80">
          {productOptions.map((p) => (
            <label
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
            >
              <span className="text-sm">{p.name}</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-300"
                checked={selectedProductIds.includes(p.id)}
                onChange={() => toggleProduct(p.id)}
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="text-sm text-zinc-500">No products.</div>
      )}
    </div>
  );
}

function DiscountsColumn({
  discountsLoading,
  discountsErr,
  displayDiscounts,
  selectedDiscountIds,
  toggleDiscount,
}: {
  discountsLoading: boolean;
  discountsErr: string | null;
  displayDiscounts: Array<DiscountMeta & { nowIneligible?: boolean }>;
  selectedDiscountIds: string[];
  toggleDiscount: (id: string) => void;
}) {
  return (
    <div className="space-y-2 border-t p-3 md:border-l md:border-t-0">
      <div className="text-center text-sm font-semibold md:text-left">
        Applicable Discounts
      </div>

      {discountsLoading ? (
        <div className="text-sm text-zinc-500">Loading…</div>
      ) : discountsErr ? (
        <div className="text-sm text-rose-600">{discountsErr}</div>
      ) : displayDiscounts.length ? (
        <div className="max-h-64 space-y-2 overflow-auto md:max-h-80">
          {displayDiscounts.map((d) => (
            <label
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
              title={
                d.nowIneligible
                  ? "This discount was applied earlier but is not eligible for the current plan selection."
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-300"
                  checked={selectedDiscountIds.includes(d.id)}
                  onChange={() => toggleDiscount(d.id)}
                />
                <span className="text-sm font-medium">{d.label}</span>
                {d.nowIneligible && (
                  <span className="ml-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    not eligible for current selection
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {d.percentOff ? `${d.percentOff}% off` : ""}
                {d.amountOff
                  ? (d.percentOff ? " • " : "") +
                    `₱${d.amountOff.toLocaleString("en-PH")}`
                  : ""}
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="text-sm text-zinc-500">No discounts.</div>
      )}

      {selectedDiscountIds.length ? (
        <div className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200">
          Selected:{" "}
          {displayDiscounts
            .filter((d) => selectedDiscountIds.includes(d.id))
            .map((d) => d.label)
            .join(", ")}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------- Main Page --------------------------- */

const AdminAppointments: React.FC = () => {
  const { loadUpcomingAdminAppointments, updateAppointment } =
    useAppointments();
  const { createFeedbackForAppointment } = useFeedbackContext();
  const { days } = useThreeWeekMonSat();

  const [tab, setTab] = useState<"Upcoming" | "History">("Upcoming");
  const [data, setData] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [viewing, setViewing] = useState<Appt | null>(null);
  const [editing, setEditing] = useState<Appt | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const [confirm, setConfirm] = useState<
    { type: "start"; appt: Appt } | { type: "cancel"; appt: Appt } | null
  >(null);

  /** Soft refresh without page reload */
  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const rows = await loadUpcomingAdminAppointments();
      setData(rows as unknown as Appt[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load appointments.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [loadUpcomingAdminAppointments]);

  // initial load (Upcoming)
  useEffect(() => {
    if (tab === "Upcoming") void refreshAll();
  }, [refreshAll, tab]);

  /** Group by day for the next 3 weeks (Mon–Sat scaffold) */
  const grouped = useMemo(() => {
    if (tab !== "Upcoming") return new Map<string, Appt[]>();
    const byDay = new Map<string, Appt[]>();
    const subset = data.filter((a) => a.status !== "Cancelled");
    for (const a of subset) {
      const arr = byDay.get(a.date) ?? [];
      arr.push(a);
      byDay.set(a.date, arr);
    }
    const map = new Map<string, Appt[]>();
    days.forEach((d) => {
      const items = (byDay.get(d) ?? []).sort((x, y) =>
        x.start.localeCompare(y.start)
      );
      map.set(d, items);
    });
    return map;
  }, [data, days, tab]);

  /** Optimistic state patcher */
  const patchLocal = useCallback(
    (id: string, patch: Partial<Appt>) =>
      setData((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
      ),
    []
  );

  /** Status helpers */
  const isToday = useCallback((d: string) => d === todayISO(), []);
  const isBlueState = useCallback(
    (a: Appt) =>
      a.status !== "Ongoing" &&
      a.status !== "Cancelled" &&
      a.status !== "Completed",
    []
  );
  const canStartProgress = useCallback(
    (a: Appt) => isBlueState(a) && isToday(a.date),
    [isBlueState, isToday]
  );

  /** Auto-progress Booked at start time (every 30s) */
  useEffect(() => {
    if (tab !== "Upcoming") return;
    const tick = async () => {
      const now = nowHHMM();
      const todaysBooked = data.filter(
        (a) =>
          a.status === "Booked" && isToday(a.date) && cmpHHMM(a.start, now) <= 0
      );
      if (todaysBooked.length === 0) return;

      todaysBooked.forEach((a) => patchLocal(a.id, { status: "Ongoing" }));

      await Promise.allSettled(
        todaysBooked.map((a) =>
          updateAppointment(a.id, { status: "Ongoing" as any }).catch(() => {
            patchLocal(a.id, { status: "Booked" });
          })
        )
      );
    };

    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, [data, isToday, patchLocal, updateAppointment, tab]);

  /** Button handlers (optimistic) */
  const handleStartProgress = async (a: Appt) => {
    patchLocal(a.id, { status: "Ongoing" });
    try {
      await updateAppointment(a.id, { status: "Ongoing" as any });
    } catch {
      patchLocal(a.id, { status: a.status });
    }
  };

  const handleMarkComplete = async (a: Appt) => {
    // Optimistic UI
    patchLocal(a.id, { status: "Completed" });

    try {
      await updateAppointment(a.id, { status: "Completed" as any });
    } catch (err) {
      patchLocal(a.id, { status: "Ongoing" });
      console.error("Failed to set Completed:", err);
      return;
    }

<<<<<<< HEAD
    if (a.customer_id) {
      createFeedbackForAppointment(a.id).catch((e) => {
        console.error("Feedback creation failed (non-blocking):", e);
      });
    }
=======
    // ✅ Always create feedback (idempotent) and ensure customer_id is set from DB
    //    The hook fetches Appointments → grabs customer_id → writes into Feedback.customer_id
    createFeedbackForAppointment(a.id).catch((e) => {
      // Non-blocking (don't revert completion on feedback errors)
      console.error("Feedback creation failed (non-blocking):", e);
    });
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  };

  const handleCancel = async (a: Appt) => {
    patchLocal(a.id, { status: "Cancelled" });
    try {
      await updateAppointment(a.id, { status: "Cancelled" as any });
    } catch {
      patchLocal(a.id, { status: a.status });
    }
  };

  /** Color coding */
  const tileBg = (a: Appt) => {
    if (a.status === "Cancelled") return "bg-rose-50";
    if (a.status === "Completed") return "bg-green-50";
    if (a.status === "Ongoing") return "bg-fuchsia-50";
    return "bg-blue-50"; // Booked / Walk-In / others
  };

  /** Button cluster */
  const Actions = ({ a }: { a: Appt }) => {
    if (a.status === "Cancelled")
      return <div className="flex items-center gap-2" />;

    if (a.status === "Completed") {
      return (
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-400"
            onClick={() => setViewing(a)}
          >
            View Details
          </button>
        </div>
      );
    }

    if (a.status === "Ongoing") {
      return (
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-400"
            onClick={() => setEditing(a)}
          >
            Modify Details
          </button>
          <button
            className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-400"
            onClick={() => handleMarkComplete(a)}
          >
            Mark Complete
          </button>
          <button
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            onClick={() => setConfirm({ type: "cancel", appt: a })}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {canStartProgress(a) && (
          <button
            className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
            onClick={() => setConfirm({ type: "start", appt: a })}
          >
            Start Progress
          </button>
        )}
        <button
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          onClick={() => setConfirm({ type: "cancel", appt: a })}
        >
          Cancel
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <main className="mx-auto w-full max-w-5xl p-6">
        {/* Header (title, then tabs below) */}
        <div className="mb-6 pt-5">
          <h1 className="text-3xl font-bold">Appointment Management</h1>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="inline-flex rounded-xl bg-white p-1 shadow">
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  tab === "Upcoming" ? "bg-amber-400" : ""
                }`}
                onClick={() => setTab("Upcoming")}
              >
                Upcoming
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  tab === "History" ? "bg-amber-400" : ""
                }`}
                onClick={() => setTab("History")}
              >
                History
              </button>
            </div>

            {tab === "Upcoming" && (
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black shadow hover:bg-amber-500"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create Service Transaction
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {tab === "History" ? (
          <AdminAppointmentHistory />
        ) : (
          <>
            <h2 className="mb-3 text-[#3a73f6]">Next 3 Weeks (Mon–Sat)</h2>

            {loading ? (
              <div className="rounded-2xl border p-6 text-center text-zinc-500">
                Loading…
              </div>
            ) : err ? (
              <div className="rounded-2xl border p-6 text-center text-rose-600">
                {err}
              </div>
            ) : (
              days.map((dayIso) => {
                const items = grouped.get(dayIso) ?? [];
                return (
                  <section key={dayIso} className="mb-8">
                    <h3 className="mb-3 font-semibold text-zinc-700">
                      {fmtDateLong(dayIso)}
                    </h3>

                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-center text-zinc-400">
                        No appointments.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((a) => (
                          <div
                            key={a.id}
                            className={`flex items-center justify-between rounded-2xl px-4 py-3 ${tileBg(
                              a
                            )}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {a.status === "Completed" && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                                {a.status === "Ongoing" && (
                                  <ArrowUpFromLine className="h-5 w-5 text-pink-500" />
                                )}
                                {a.status !== "Cancelled" &&
                                  a.status !== "Completed" &&
                                  a.status !== "Ongoing" && (
                                    <Clock3 className="h-5 w-5 text-blue-500" />
                                  )}
                                {a.status === "Cancelled" && (
                                  <XCircle className="h-5 w-5 text-rose-500" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-semibold">
                                  {fmtTime(a.start)} - {fmtTime(a.end)}
                                  {a.status === "Walk-In" ? " • Walk-In" : ""}
                                  {a.status === "Ongoing" ? " • Ongoing" : ""}
                                </div>
                                <div className="text-sm">
                                  {(a.customer_id ? a.customer : "Walk-In") +
                                    " – " +
                                    (a.plan || "—")}
                                </div>
                                <div className="text-xs text-zinc-600">
                                  Stylist: {a.stylist || "—"}
                                </div>
                                {a.discountName ? (
                                  <div className="mt-0.5 text-xs text-green-700">
                                    Discount: {a.discountName}
                                  </div>
                                ) : null}

                                {/* Read-only Customer Notes line on the tile */}
                                {a.comments ? (
                                  <div className="mt-0.5 line-clamp-1 text-xs text-zinc-700">
                                    Customer Notes: {a.comments}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <Actions a={a} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {viewing && (
        <ViewDetailsModal appt={viewing} onClose={() => setViewing(null)} />
      )}

      {editing && (
        <ModifyDetailsModal
          appt={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => patchLocal(editing.id, patch)}
        />
      )}

      {/* BookAppointments inside a modal (Upcoming only) */}
      {createOpen && tab === "Upcoming" && (
        <ModalShell
          title="Create Service Transaction"
          onClose={() => setCreateOpen(false)}
        >
          <div className="max-h-[70vh] overflow-auto">
            <BookAppointments
              customerId={null}
              onBooked={async () => {
                setCreateOpen(false);
                await refreshAll();
              }}
            />
          </div>
        </ModalShell>
      )}

      {/* Confirmation: Start Progress / Cancel */}
      {confirm && confirm.type === "start" && (
        <ConfirmModal
          title="Start Service Progress?"
          description={
            <>
              You’re about to mark this appointment as <b>Ongoing</b>. This will
              update its status and show it as in-progress.
            </>
          }
          confirmLabel="Start Progress"
          tone="success"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await handleStartProgress(confirm.appt);
            setConfirm(null);
          }}
        />
      )}
      {confirm && confirm.type === "cancel" && (
        <ConfirmModal
          title="Cancel this Appointment?"
          description={
            <>
              This will mark the appointment as <b>Cancelled</b>. This will
              completely cancel the appointment.
            </>
          }
          confirmLabel="Yes, Cancel"
          tone="danger"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await handleCancel(confirm.appt);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminAppointments;

/* ----------------------- Tiny UI atoms ----------------------- */
function Label({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={[
        "mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Hint({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={["mt-1 text-xs text-zinc-500", className].join(" ")}>
      {children}
    </div>
  );
}

function Input(
  props: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none",
        "focus:ring-2 focus:ring-amber-200",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Select(
  props: React.DetailedHTMLProps<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >
) {
  return (
    <select
      {...props}
      className={[
        "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none",
        "focus:ring-2 focus:ring-amber-200",
        props.className || "",
      ].join(" ")}
    />
  );
}

function ModernField({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div
        className={[
          "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900",
          valueClass,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function ModernBox({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <Label>{label}</Label>
      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
        {children}
      </div>
    </div>
  );
}
