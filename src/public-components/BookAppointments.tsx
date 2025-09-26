import { useState, useMemo, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import { usePromoManagementContext } from "@/features/promo-management/context/promoManagementContext";
import useAuth from "@/features/auth/hooks/UseAuth";
import {
  useBookingLimits,
  toISODate,
  formatAMPMCompact,
  formatDateLong,
  fmtPHP,
} from "@/public-hooks/helperMethods";

/* ---------- Types ---------- */
type Props = {
  customerId?: string | null;
  onBooked?: (appointmentId: string) => void;
};

type PlanChoice = { type: "Service" | "Package"; id: string };
type PlanOption = {
  type: "Service" | "Package";
  id: string;
  name: string;
  duration: number;
};

type Discount = {
  discount_id: string;
  name: string;
  type?: string | null; // may be "Fixed" | "Percentage" in your data
  applies_to?: string | null; // "Service" | "Package" | "All"
  value: number;
  start_date?: string | null;
  end_date?: string | null;
  amount_of_uses?: number | null;
  status?: string | null;
  display?: boolean | null;
};

const BookAppointments: React.FC<Props> = ({ customerId = null, onBooked }) => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [stylist, setStylist] = useState<string>("");
  const [plan, setPlan] = useState<PlanChoice | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // 👇 NEW: walk-in name fields (admin-only use)
  const [walkFirst, setWalkFirst] = useState("");
  const [walkMiddle, setWalkMiddle] = useState("");
  const [walkLast, setWalkLast] = useState("");

  // modal bits
  const [showConfirm, setShowConfirm] = useState(false);
  const [comments, setComments] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // discounts UI
  const [applicableDiscounts, setApplicableDiscounts] = useState<Discount[]>(
    []
  );
  const [discountErr, setDiscountErr] = useState<string | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | "">("");

  const { today, maxDate, isSunday } = useBookingLimits();
  const { stylists } = useServicesAndStylistContext();
  const { role } = useAuth(); // 👈 NEW

  const {
    services,
    packages,
    getPlanOptionsForStylist,
    getAvailableTimeSlots,
    createAppointment,
    loadServices,
    loadPackages,
    canUseDiscount, // from hook
  } = useAppointments();

  const { discounts, fetchDiscounts } = usePromoManagementContext();

  /* preload */
  useEffect(() => {
    void loadServices();
    void loadPackages();
    void fetchDiscounts?.();
  }, [loadServices, loadPackages, fetchDiscounts]);

  /* responsive */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ISO date string */
  const dateISO = useMemo(() => (date ? toISODate(date) : ""), [date]);

  /* plan options for stylist */
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  useEffect(() => {
    if (!stylist) {
      setPlanOptions([]);
      setPlan(null);
      setPlansError(null);
      return;
    }
    (async () => {
      try {
        setPlansLoading(true);
        setPlansError(null);
        const opts = await getPlanOptionsForStylist(stylist);
        setPlanOptions(opts);
        if (
          plan &&
          !opts.some((o) => o.type === plan.type && o.id === plan.id)
        ) {
          setPlan(null);
        }
      } catch (err: any) {
        setPlansError(err?.message || "Failed to load plans.");
        setPlanOptions([]);
        setPlan(null);
      } finally {
        setPlansLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylist, getPlanOptionsForStylist]);

  /* time slots */
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsErr, setSlotsErr] = useState<string | null>(null);

  useEffect(() => {
    if (!stylist || !plan || !dateISO) {
      setSlots([]);
      setSelectedSlot(null);
      setSlotsErr(null);
      return;
    }
    (async () => {
      try {
        setSlotsLoading(true);
        setSlotsErr(null);
        const s = await getAvailableTimeSlots({
          stylist_id: stylist,
          plan: { type: plan.type, id: plan.id },
          date: dateISO,
        });
        setSlots(s);
        setSelectedSlot(null);
      } catch (err: any) {
        setSlotsErr(err?.message || "Failed to load time availability.");
        setSlots([]);
        setSelectedSlot(null);
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [stylist, plan, dateISO, getAvailableTimeSlots]);

  const isAdmin = role === "admin";
  const isWalkIn = isAdmin && !customerId; // 👈 our rule: admin booking without a linked customer

  // must-have fields
  const walkNameOK = !isWalkIn || (walkFirst.trim() && walkLast.trim());

  const canBook = Boolean(
    stylist && plan && dateISO && selectedSlot && walkNameOK
  );

  const selectedPlanMeta = useMemo(() => {
    if (!plan) return null;
    return (
      planOptions.find((p) => p.type === plan.type && p.id === plan.id) || null
    );
  }, [plan, planOptions]);

  const stylistName = useMemo(
    () => stylists.find((s) => s.stylist_id === stylist)?.name || "",
    [stylists, stylist]
  );

  const priceText = useMemo(() => {
    if (!plan) return "—";
    if (plan.type === "Service") {
      const svc = (services as any[]).find((s) => s.service_id === plan.id);
      const min = svc?.min_price ?? null;
      const max = svc?.max_price ?? null;
      if (min == null && max == null) return "—";
      if (min != null && max != null)
        return min === max ? `₱${min}` : `₱${min} - ₱${max}`;
      return `₱${(min ?? max) as number}`;
    } else {
      const pkg = (packages as any[]).find((p) => p.package_id === plan.id);
      return pkg?.price != null ? `₱${pkg.price}` : "—";
    }
  }, [plan, services, packages]);

  /* ---------- Modal total with discount ---------- */
  const baseRange = useMemo(() => {
    if (!plan) return null;
    if (plan.type === "Service") {
      const svc = (services as any[]).find((s) => s.service_id === plan.id);
      if (!svc) return null;
      const min = Number(svc?.min_price ?? 0);
      const max = Number(svc?.max_price ?? svc?.min_price ?? 0);
      return { min, max: Math.max(max, min) };
    } else {
      const pkg = (packages as any[]).find((p) => p.package_id === plan.id);
      if (pkg?.price == null) return null;
      const price = Number(pkg.price);
      return { min: price, max: price };
    }
  }, [plan, services, packages]);

  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(
    null
  );
  useEffect(() => {
    setSelectedDiscount(
      applicableDiscounts.find((d) => d.discount_id === selectedDiscountId) ??
        null
    );
  }, [applicableDiscounts, selectedDiscountId]);

  const discountedRange = useMemo(() => {
    if (!baseRange || !selectedDiscount) return null;
    const rawMethod = String(
      (selectedDiscount as any).discount_type ??
        (selectedDiscount as any).method ??
        selectedDiscount.type ??
        ""
    ).toLowerCase();

    const isPercentage = rawMethod.includes("percent") || rawMethod === "%";
    const v = Number(selectedDiscount.value ?? 0);

    if (isPercentage) {
      const pct = Math.min(Math.max(v, 0), 100);
      const f = 1 - pct / 100;
      return {
        min: Math.max(baseRange.min * f, 0),
        max: Math.max(baseRange.max * f, 0),
      };
    }
    return {
      min: Math.max(baseRange.min - v, 0),
      max: Math.max(baseRange.max - v, 0),
    };
  }, [baseRange, selectedDiscount]);

  const discountedPriceText = useMemo(() => {
    if (!discountedRange) return "—";
    const { min, max } = discountedRange;
    return min === max ? fmtPHP(min) : `${fmtPHP(min)} - ${fmtPHP(max)}`;
  }, [discountedRange]);

  /* ---------- Compute applicable discounts (with eligibility) ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setDiscountErr(null);
      setApplicableDiscounts([]);
      setSelectedDiscountId("");

      if (!plan || !dateISO) return;

      try {
        const base = (discounts as Discount[] | undefined) ?? [];

        const isActiveForDate = (d: Discount) => {
          const startOk = !d.start_date || dateISO >= d.start_date;
          const endOk = !d.end_date || dateISO <= d.end_date;
          return startOk && endOk;
        };

        const typeMatch = (d: Discount) => {
          const raw = ((d.applies_to || d.type || "all") as string)
            .toLowerCase()
            .trim();
          if (["all", "any", "both"].includes(raw)) return true;
          return plan.type === "Service"
            ? ["service", "services"].includes(raw)
            : ["package", "packages"].includes(raw);
        };

        const prelim = base.filter(
          (d) =>
            (d.status ?? "Active").toLowerCase() === "active" &&
            (d.display ?? true) &&
            isActiveForDate(d) &&
            typeMatch(d)
        );

        if (prelim.length === 0) {
          if (!cancelled) setApplicableDiscounts([]);
          return;
        }

        const checked = await Promise.all(
          prelim.map(async (d) => {
            const res = await canUseDiscount({
              discount_id: d.discount_id,
              customer_id: customerId ?? null,
            });
            return { d, ok: res.ok };
          })
        );

        const eligible = checked.filter((c) => c.ok).map((c) => c.d);
        if (!cancelled) setApplicableDiscounts(eligible);
      } catch (e: any) {
        if (!cancelled)
          setDiscountErr(e?.message || "Failed to load discounts.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan, dateISO, discounts, canUseDiscount, customerId]);

  /* booking */
  const openConfirm = () => {
    if (!canBook) return;
    setShowConfirm(true);
  };

  const resetAll = () => {
    setShowConfirm(false);
    setComments("");
    setSelectedSlot(null);
    setPlan(null);
    setStylist("");
    setDate(new Date());
    setPlanOptions([]);
    setSlots([]);
    setSlotsErr(null);
    setApplicableDiscounts([]);
    setSelectedDiscountId("");
    setDiscountErr(null);
    setWalkFirst("");
    setWalkMiddle("");
    setWalkLast("");
  };

  const doConfirm = async () => {
    if (!canBook || !plan || !selectedSlot) return;
    try {
      setIsBooking(true);

      // FINAL GUARD: re-check discount eligibility right before booking
      if (selectedDiscountId) {
        const elig = await canUseDiscount({
          discount_id: selectedDiscountId,
          customer_id: customerId ?? null,
        });
        if (!elig.ok) {
          const msg =
            elig.reason === "global"
              ? "Sorry, this discount has reached its total redemption limit."
              : elig.reason === "customer"
              ? "You’ve already used this discount the maximum allowed times."
              : "This discount is no longer available.";
          setDiscountErr(msg);
          setIsBooking(false);
          return;
        }
      }

      // If admin walk-in and you want to preserve middle name despite schema, append to comments.
      const commentsWithMiddle =
        isWalkIn && walkMiddle.trim()
          ? `${comments || ""}${
              comments ? " " : ""
            }(Middle name: ${walkMiddle.trim()})`
          : comments || null;

      const id = await createAppointment({
        stylist_id: stylist,
        customer_id: customerId ?? null,
        plan_type: plan.type,
        plan_id: plan.id,
        date: dateISO,
        expectedStart_time: selectedSlot.start,
        expectedEnd_time: selectedSlot.end,
        comments: commentsWithMiddle,
        total_amount: null,
        payment_method: null,
        discount_id: selectedDiscountId || null,

        // 👇 NEW: walk-in names (saved to Appointments.firstName/lastName)
        firstName: isWalkIn ? walkFirst.trim() : undefined,
        lastName: isWalkIn ? walkLast.trim() : undefined,
        middleName: isWalkIn ? walkMiddle.trim() : undefined,
      });
      resetAll();
      onBooked?.(id);
    } catch (e) {
      console.error("createAppointment error:", e);
      setDiscountErr("Failed to create appointment. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const cancelConfirm = () => setShowConfirm(false);

  const fullWalkInName =
    isWalkIn && (walkFirst || walkMiddle || walkLast)
      ? [walkFirst, walkMiddle, walkLast].filter(Boolean).join(" ")
      : null;

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        background: "#fff",
        padding: isMobile ? "20px" : "30px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>
        Book An Appointment
      </h2>

      {/* Admin Walk-in Name Inputs */}
      {isWalkIn && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            padding: "12px",
            border: "1px dashed #ccc",
            borderRadius: 10,
            marginBottom: 16,
            background: "#fafafa",
          }}
        >
          <div style={{ gridColumn: isMobile ? "auto" : "1 / span 2" }}>
            <label
              style={{ fontWeight: 600, display: "block", marginBottom: 6 }}
            >
              Walk-in Customer
            </label>
            <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>
              Enter the guest’s name. First and last name are required.
            </p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              First name *
            </label>
            <input
              value={walkFirst}
              onChange={(e) => setWalkFirst(e.target.value)}
              placeholder="Juan"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: 10,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Middle name
            </label>
            <input
              value={walkMiddle}
              onChange={(e) => setWalkMiddle(e.target.value)}
              placeholder="Santos"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: 10,
              }}
            />
          </div>

          <div style={{ gridColumn: isMobile ? "auto" : "1 / span 2" }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              Last name *
            </label>
            <input
              value={walkLast}
              onChange={(e) => setWalkLast(e.target.value)}
              placeholder="Dela Cruz"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: 10,
              }}
            />
          </div>
        </div>
      )}

      {/* Row: Stylist + Plan + Discount */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "20px",
          marginBottom: "16px",
        }}
      >
        {/* Stylist */}
        <div>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Stylist
          </label>
          <select
            value={stylist}
            onChange={(e) => setStylist(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "10px",
            }}
          >
            <option value="">Select stylist</option>
            {stylists.map((s) => (
              <option key={s.stylist_id} value={s.stylist_id}>
                {s.name} {s.role ? `- ${s.role}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Service/Package Plan */}
        <div>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Service Plan
          </label>
          <select
            value={plan ? `${plan.type}:${plan.id}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return setPlan(null);
              const [type, id] = v.split(":");
              setPlan({ type: type as "Service" | "Package", id });
            }}
            disabled={!stylist || plansLoading}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "10px",
            }}
          >
            <option value="">
              {plansLoading ? "Loading..." : "Select a service or package"}
            </option>

            {plansError && (
              <option disabled value="">
                ⚠ {plansError}
              </option>
            )}

            {planOptions.some((p) => p.type === "Service") && (
              <optgroup label="Services">
                {planOptions
                  .filter((p) => p.type === "Service")
                  .map((opt) => (
                    <option
                      key={`Service:${opt.id}`}
                      value={`Service:${opt.id}`}
                    >
                      {opt.name} — {opt.duration} min
                    </option>
                  ))}
              </optgroup>
            )}

            {planOptions.some((p) => p.type === "Package") && (
              <optgroup label="Packages">
                {planOptions
                  .filter((p) => p.type === "Package")
                  .map((opt) => (
                    <option
                      key={`Package:${opt.id}`}
                      value={`Package:${opt.id}`}
                    >
                      {opt.name} — {opt.duration} min
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Discount */}
        <div style={{ gridColumn: isMobile ? "auto" : "1 / span 2" }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Discount
          </label>
          {discountErr ? (
            <div style={{ color: "#b91c1c", padding: "8px 0" }}>
              {discountErr}
            </div>
          ) : (
            <select
              value={selectedDiscountId}
              onChange={(e) => setSelectedDiscountId(e.target.value)}
              disabled={!plan || applicableDiscounts.length === 0}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "10px",
                color:
                  !plan || applicableDiscounts.length === 0
                    ? "#9ca3af"
                    : "#111",
                background:
                  !plan || applicableDiscounts.length === 0
                    ? "#f9fafb"
                    : "#fff",
              }}
            >
              {!plan ? (
                <option value="">Select a plan first</option>
              ) : applicableDiscounts.length === 0 ? (
                <option value="">No discounts available</option>
              ) : (
                <>
                  <option value="">— No Discount —</option>
                  {applicableDiscounts.map((d) => (
                    <option key={d.discount_id} value={d.discount_id}>
                      {d.name} ({d.value})
                    </option>
                  ))}
                </>
              )}
            </select>
          )}
        </div>
      </div>

      {/* Row: Date + Time */}
      <p style={{ fontSize: 16, marginBottom: 12 }}>
        2. Select a date and available time
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "30px",
        }}
      >
        <div style={{ flex: "1 1 300px" }}>
          <DatePicker
            selected={date}
            onChange={(d) => setDate(d)}
            minDate={today}
            maxDate={maxDate}
            filterDate={isSunday}
            inline
            disabled={!stylist || !plan}
          />
        </div>

        {/* Time buttons */}
        <div
          style={{
            flex: "1 1 300px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Time Available
          </h3>

          {!stylist || !plan || !dateISO ? (
            <p style={{ color: "#6b7280" }}>Pick stylist, plan, and date.</p>
          ) : slotsLoading ? (
            <p style={{ color: "#6b7280" }}>Loading times…</p>
          ) : slotsErr ? (
            <p style={{ color: "#b91c1c" }}>{slotsErr}</p>
          ) : slots.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No available times for this date.
            </p>
          ) : (
            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                paddingRight: 6,
                border: "1px solid #eee",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  padding: 12,
                }}
              >
                {slots.map((s) => {
                  const selected =
                    selectedSlot?.start === s.start &&
                    selectedSlot?.end === s.end;
                  return (
                    <button
                      key={`${s.start}-${s.end}`}
                      onClick={() => setSelectedSlot(s)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 9999,
                        background: selected ? "#f59e0b" : "#FFB030",
                        color: "#fff",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        minWidth: isMobile ? "100%" : "200px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      }}
                      title={`${s.start} - ${s.end}`}
                    >
                      {formatAMPMCompact(s.start)} - {formatAMPMCompact(s.end)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Book → opens modal */}
      <button
        onClick={openConfirm}
        disabled={!canBook}
        style={{
          marginTop: 20,
          width: "100%",
          padding: 14,
          background: canBook ? "#FFB030" : "#e5e7eb",
          color: canBook ? "#fff" : "#9ca3af",
          fontWeight: 600,
          borderRadius: 10,
          border: "none",
          cursor: canBook ? "pointer" : "not-allowed",
        }}
        title={
          !canBook && isWalkIn && !walkNameOK
            ? "Enter first and last name for walk-in"
            : undefined
        }
      >
        Book Appointment
      </button>

      {/* Confirmation Modal */}
      {showConfirm && selectedSlot && plan && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={cancelConfirm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
              Book Appointment
            </h3>

            <p style={{ color: "#374151", marginBottom: 18 }}>
              Enter details for your appointment on{" "}
              <b>{formatDateLong(dateISO)}</b> at{" "}
              <b>
                {formatAMPMCompact(selectedSlot.start)} -{" "}
                {formatAMPMCompact(selectedSlot.end)}
              </b>
            </p>

            <h4
              style={{ color: "#6b7280", letterSpacing: 0.3, marginBottom: 10 }}
            >
              Appointment Details
            </h4>

            <div
              style={{
                border: "1px solid #111",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  rowGap: 8,
                }}
              >
                {/* 👇 NEW: show customer name (walk-in) */}
                {isWalkIn && (
                  <>
                    <span>Customer</span>
                    <span>
                      {fullWalkInName ||
                        [walkFirst, walkLast].filter(Boolean).join(" ")}
                    </span>
                  </>
                )}

                <span>Service</span>
                <span>
                  {selectedPlanMeta?.name ||
                    (plan.type === "Service"
                      ? "Selected Service"
                      : "Selected Package")}
                </span>

                <span>Duration</span>
                <span>
                  {selectedPlanMeta?.duration
                    ? `${selectedPlanMeta.duration} mins`
                    : "—"}
                </span>

                <span>Stylist</span>
                <span>{stylistName || "—"}</span>

                <span>Price</span>
                <span>{priceText}</span>

                <span>Discount</span>
                <span>{selectedDiscount ? selectedDiscount.name : "—"}</span>

                <span>Total after discount</span>
                <span>{selectedDiscount ? discountedPriceText : "—"}</span>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Additional Comments (optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #111",
                  borderRadius: 12,
                  resize: "vertical",
                }}
                placeholder="Any notes or requests for your stylist…"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                onClick={cancelConfirm}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "#eee",
                  color: "#111",
                  fontWeight: 600,
                }}
                disabled={isBooking}
              >
                Cancel
              </button>
              <button
                onClick={doConfirm}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: isBooking ? "#fbbf24" : "#FFB030",
                  opacity: isBooking ? 0.8 : 1,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: isBooking ? "not-allowed" : "pointer",
                }}
                disabled={isBooking}
                title={isBooking ? "Booking…" : "Confirm Appointment"}
              >
                {isBooking ? "Booking…" : "Confirm Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointments;
