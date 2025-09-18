import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  CheckCircle2,
  Undo2,
  Clock3,
  XCircle,
  ArrowUpFromLine,
  X,
} from "lucide-react";
import BookAppointments from "@/public-components/BookAppointments";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import AdminAppointmentHistory from "./AdminAppointmentHistory";
import useServicesAndStylists from "@/features/servicesAndStylist/hooks/useServicesAndStylist";

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
};

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")}${ampm}`;
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
  const start = useMemo(() => new Date(), []);
  const days = useMemo(() => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header pinned */}
        <div className="flex items-center justify-between border-b p-6">
          <h3 className="text-2xl font-bold">{title}</h3>
          <button
            className="rounded-full p-1 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {/* Scrollable content, capped height */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
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
          <div className="text-gray-700">{description}</div>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl bg-gray-200 px-5 py-2 font-semibold text-gray-800 hover:bg-gray-300"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-xl px-5 py-2 font-semibold ${confirmClasses}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ViewDetailsModal({
  appt,
  onClose,
  onEdit,
}: {
  appt: Appt;
  onClose: () => void;
  onEdit: () => void;
}) {
  const peso = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <ModalShell title="View Service Transaction Details" onClose={onClose}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm text-gray-500">
            Booked Starting Time:
          </div>
          <div className="text-lg font-semibold">{fmtTime(appt.start)}</div>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-500">
            Expected Ending Time:
          </div>
          <div className="text-lg font-semibold">{fmtTime(appt.end)}</div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500">Time Started:</div>
          <div className="text-lg font-semibold">—</div>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-500">Time Ended:</div>
          <div className="text-lg font-semibold">—</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm text-gray-500">Stylist</div>
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md border px-2 py-1 text-sm">
                {appt.stylist || "—"}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-500">Customer Name</div>
          <div className="rounded-xl border p-3">{appt.customer || "—"}</div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500">Service Plan</div>
          <div className="rounded-xl border p-3">{appt.plan || "—"}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm text-gray-500">Status</div>
          <div className="rounded-xl border p-3">{appt.status}</div>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-500">Total Amount</div>
          <div className="rounded-xl border p-3 text-lg font-semibold">
            {peso(appt.price || 0)}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <button
          onClick={onEdit}
          className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-500"
        >
          Modify Details
        </button>
        <button className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-500">
          Create Invoice
        </button>
      </div>
    </ModalShell>
  );
}

function ModifyDetailsModal({
  appt,
  onClose,
  onSave,
}: {
  appt: Appt;
  onClose: () => void;
  onSave: (patch: Partial<Appt>) => void;
}) {
  // Load stylists (available = display=true)
  const { stylists } = useServicesAndStylists();

  // Load services & packages (available = display=true)
  const {
    services: svcList,
    packages: pkgList,
    loadServices,
    loadPackages,
    updateAppointmentDetails,
  } = useAppointments();

  useEffect(() => {
    if (!svcList.length) void loadServices();
    if (!pkgList.length) void loadPackages();
  }, [svcList.length, pkgList.length, loadServices, loadPackages]);

  // Local state
  const [payment, setPayment] = useState<"Cash" | "Card" | "GCash">("Cash");
  const [total, setTotal] = useState(appt.price || 0);
  const [discount, setDiscount] = useState(appt.discountName || "");

  // Selections
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<
    Array<{ type: "Service" | "Package"; id: string }>
  >([]);

  // Preselect from current appt (by name match) — supports multiple stylists
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

  // Preselect plans (supports multiple by name)
  useEffect(() => {
    if (!appt.plan || (!svcList.length && !pkgList.length)) return;
    const wanted = appt.plan
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const picks: Array<{ type: "Service" | "Package"; id: string }> = [];

    for (const name of wanted) {
      const svc = svcList.find((s: any) => String(s.name).trim() === name);
      if (svc?.service_id) {
        picks.push({ type: "Service", id: String(svc.service_id) });
        continue;
      }
      const pkg = pkgList.find((p: any) => String(p.name).trim() === name);
      if (pkg?.package_id) {
        picks.push({ type: "Package", id: String(pkg.package_id) });
      }
    }

    if (picks.length) setSelectedPlans(picks);
  }, [appt.plan, svcList, pkgList]);

  // ---------- Options with numeric price (for totals) ----------
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

  // ---------- Subtotal & total auto-compute ----------
  const subtotal = useMemo(() => {
    if (!selectedPlans.length || !planOptions.length) return 0;
    const key = (t: "Service" | "Package", id: string) => `${t}:${id}`;
    const priceMap = new Map(
      planOptions.map((o) => [key(o.type, o.id), o.price || 0])
    );
    return selectedPlans.reduce(
      (sum, p) => sum + (priceMap.get(key(p.type, p.id)) ?? 0),
      0
    );
  }, [selectedPlans, planOptions]);

  useEffect(() => {
    setTotal(subtotal);
  }, [subtotal]);

  const peso = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  // Persist everything to DB (amount, payment, stylists, plans)
  const persist = async () => {
    await updateAppointmentDetails({
      appointment_id: appt.id,
      stylist_ids: selectedStylistIds,
      plans: selectedPlans,
      total_amount: total,
      payment_method: payment,
    });

    // Patch UI with readable names
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

    onSave({
      price: total,
      discountName: discount || null,
      stylist: stylistNames.length ? stylistNames.join(", ") : appt.stylist,
      plan: planNames.length ? planNames.join(", ") : appt.plan,
    });
  };

  return (
    <ModalShell title="Modify Service Transaction Details" onClose={onClose}>
      {/* Times */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm text-gray-500">
            Expected Starting Time
          </div>
          <div className="text-lg font-semibold">{fmtTime(appt.start)}</div>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-500">Expected Ending Time</div>
          <div className="text-lg font-semibold">{fmtTime(appt.end)}</div>
        </div>

        {/* Optional: actual time pickers left as-is */}
        <div>
          <div className="mb-2 text-sm text-gray-500">Time Started</div>
          <div className="flex gap-2">
            <select className="rounded-lg border px-2 py-1">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1}>{String(i + 1).padStart(2, "0")}</option>
              ))}
            </select>
            <select className="rounded-lg border px-2 py-1">
              {["00", "15", "30", "45"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select className="rounded-lg border px-2 py-1">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500">Time Ended</div>
          <div className="flex gap-2">
            <select className="rounded-lg border px-2 py-1">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1}>{String(i + 1).padStart(2, "0")}</option>
              ))}
            </select>
            <select className="rounded-lg border px-2 py-1">
              {["00", "15", "30", "45"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select className="rounded-lg border px-2 py-1">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stylists & Plans */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Stylists checklist (scrollable) */}
        <div>
          <div className="mb-2 text-sm text-gray-500">Stylists</div>
          <div className="rounded-xl border p-3 max-h-64 md:max-h-80 overflow-auto">
            {stylists?.length ? (
              <div className="space-y-2">
                {stylists.map((s: any) => (
                  <label key={s.stylist_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedStylistIds.includes(
                        String(s.stylist_id)
                      )}
                      onChange={() => toggleStylist(String(s.stylist_id))}
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No stylists found.</div>
            )}
          </div>
        </div>

        {/* Customer name (kept) */}
        <div>
          <div className="mb-2 text-sm text-gray-500">Customer Name</div>
          <input
            className="w-full rounded-xl border px-3 py-2"
            defaultValue={appt.customer}
            readOnly
          />
        </div>

        {/* Plans (Services & Packages) checklist */}
        <div className="md:col-span-2">
          <div className="mb-2 text-sm text-gray-500">
            Plans (Services & Packages)
          </div>
          <div className="rounded-xl border">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: options list (scrollable) */}
              <div className="p-3 space-y-2 max-h-64 md:max-h-80 overflow-auto">
                {planOptions.length ? (
                  planOptions.map((opt) => (
                    <label
                      key={`${opt.type}-${opt.id}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={isPlanChecked(opt.type, opt.id)}
                          onChange={() => togglePlan(opt.type, opt.id)}
                        />
                        <span className="text-sm">
                          {opt.name}{" "}
                          <span className="text-gray-500">
                            {opt.type === "Service" ? "(Service)" : "(Package)"}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {opt.duration ? `${opt.duration} min` : ""}
                        {opt.priceLabel ? ` • ${opt.priceLabel}` : ""}
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    Loading services & packages…
                  </div>
                )}
              </div>

              {/* Right: Products Used column (placeholder) */}
              <div className="border-t md:border-t-0 md:border-l p-3 space-y-2">
                <div className="text-sm font-semibold text-center md:text-left">
                  Products Used
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>—</span>
                </label>
                <button className="rounded-lg bg-amber-400 px-3 py-1 text-sm font-semibold hover:bg-amber-500">
                  Add Product
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            (Saving will update Appointments.total_amount/payment and replace
            links in <code>AppointmentStylists</code> and{" "}
            <code>AppointmentServicePlan</code>.)
          </p>
        </div>

        {/* Discount / Totals */}
        <div>
          <div className="mb-2 text-sm text-gray-500">Discount</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2"
              placeholder="Discount name"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
            <button className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold hover:bg-amber-500">
              Apply Discount
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Items Subtotal: <b>{peso(subtotal)}</b>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500">Total Amount</div>
          <input
            className="w-full rounded-xl border px-3 py-2 text-right font-semibold bg-gray-50"
            value={total}
            readOnly
          />
          <div className="mt-1 text-xs text-gray-500">
            Auto-computed from selected Services/Packages.
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500">Payment Method</div>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={payment}
            onChange={(e) => setPayment(e.target.value as any)}
          >
            <option>Cash</option>
            <option>Card</option>
            <option>GCash</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-amber-400 px-5 py-2 font-semibold text-black hover:bg-amber-500"
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

/* --------------------------- Main Page --------------------------- */

const AdminAppointments: React.FC = () => {
  const { loadUpcomingAdminAppointments, updateAppointment } =
    useAppointments();
  const { days } = useThreeWeekMonSat();

  const [tab, setTab] = useState<"Upcoming" | "History">("Upcoming");
  const [data, setData] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [viewing, setViewing] = useState<Appt | null>(null);
  const [editing, setEditing] = useState<Appt | null>(null);

  // Create Service Transaction modal (wraps BookAppointments)
  const [createOpen, setCreateOpen] = useState(false);

  // Confirmation modal state
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
    patchLocal(a.id, { status: "Completed" });
    try {
      await updateAppointment(a.id, { status: "Completed" as any });
    } catch {
      patchLocal(a.id, { status: "Ongoing" });
    }
  };

  const handleCancel = async (a: Appt) => {
    patchLocal(a.id, { status: "Cancelled" });
    try {
      await updateAppointment(a.id, { status: "Cancelled" as any });
    } catch {
      patchLocal(a.id, { status: a.status });
    }
  };

  const handleUndo = async (a: Appt) => {
    patchLocal(a.id, { status: "Booked" });
    try {
      await updateAppointment(a.id, { status: "Booked" as any });
    } catch {
      patchLocal(a.id, { status: "Completed" });
    }
  };

  /** Color coding */
  const tileBg = (a: Appt) => {
    if (a.status === "Cancelled") return "bg-rose-50";
    if (a.status === "Completed") return "bg-green-50";
    if (a.status === "Ongoing") return "bg-fuchsia-50";
    return "bg-blue-50"; // Booked / Walk-In / others
    // blue states are: Booked, Walk-In, etc.
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
          <button
            className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            onClick={() => handleUndo(a)}
          >
            <Undo2 className="mr-1 inline h-3 w-3" />
            Undo
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

    // Blue states
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
    <div className="flex min-h-screen bg-white text-gray-900">
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
              <div className="rounded-2xl border p-6 text-center text-gray-500">
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
                    <h3 className="mb-3 font-semibold text-gray-700">
                      {fmtDateLong(dayIso)}
                    </h3>

                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-center text-gray-400">
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
                                <div className="text-xs text-gray-600">
                                  Stylist: {a.stylist || "—"}
                                </div>
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
        <ViewDetailsModal
          appt={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
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
                await refreshAll(); // soft refresh; no page reload
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
