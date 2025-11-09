import { useEffect, useMemo, useState } from "react";
import { usePaginationContext } from "@/public-context/PaginationContext";
import { ExternalLink, X } from "lucide-react";
import { type Customer } from "@/features/auth/types/AuthTypes";
import { supabase } from "@/lib/supabaseclient";
import FeedbackForm from "@/features/feedback/components/ui/respond-feedback-form";
import { setCustomerBlocked } from "@/features/auth/hooks/UseUserProfile";
import useAppointments from "@/features/appointments/hooks/useAppointments";

type Appointment = {
  id?: string;
  datetime?: string;
  service?: string;
  status?: string;
};

type Feedback = {
  id: string;
  appointmentId?: string | null;
  date?: string;
  stylist?: string;
  service?: string;
  rating?: number;
  text?: string;
  adminResponse?: string;
};

type ProfileLike = Customer & {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  joined_at?: string;
  joined?: string;
  userId?: string;
  customer_id?: string;
  appointments?: number;
  upcomingAppointments?: Appointment[];
  feedbacks?: Feedback[];
  is_blocked?: boolean;
  auth_user_id?: string;
  role?: string;
};

const fullNameOf = (c: any) =>
  [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") ||
  c.name ||
  "Unknown";

const toDateLabel = (d?: string) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
};

const toDateTimeLabel = (dateISO?: string, hhmm?: string) => {
  if (!dateISO) return "—";
  try {
    const [y, m, d] = dateISO.split("-").map(Number);
    const [hh = 0, mm = 0] = (hhmm ?? "00:00").split(":").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm);
<<<<<<< HEAD
    return dt.toLocaleString("en-US", {
=======
    return dt.toLocaleString(undefined, {
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return `${dateISO}${hhmm ? ` ${hhmm}` : ""}`;
  }
};

const ViewProfileModal = ({
  open,
  onClose,
  profile,
  onToggleBlock,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  profile?: ProfileLike | null;
  onToggleBlock?: (customer: ProfileLike) => void;
  busy?: boolean;
}) => {
  const [loadingExtra, setLoadingExtra] = useState(false);

  const [upcoming, setUpcoming] = useState<Appointment[]>(
    profile?.upcomingAppointments ?? []
  );
  const [transactions, setTransactions] = useState<Appointment[]>([]);
  const [customerFeedbacks, setCustomerFeedbacks] = useState<Feedback[]>([]);

  const { getAppointmentPeopleAndPlans } = useAppointments();

  const [respondId, setRespondId] = useState<string | null>(null);
  const closeRespond = () => setRespondId(null);

  useEffect(() => {
    if (!open || !profile?.customer_id) {
      setUpcoming(profile?.upcomingAppointments ?? []);
      setTransactions([]);
      setCustomerFeedbacks([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingExtra(true);
        const cid = profile.customer_id;

        // Upcoming
        const { data: upRows, error: upErr } = await supabase
          .from("Appointments")
          .select("appointment_id,date,expectedStart_time,status,display")
          .eq("customer_id", cid)
          .eq("display", true)
          .in("status", ["Booked", "Ongoing", "On-Going"])
          .order("date", { ascending: true })
          .order("expectedStart_time", { ascending: true });
        if (upErr) throw upErr;

        // Transactions
        const { data: txRows, error: txErr } = await supabase
          .from("Appointments")
          .select("appointment_id,date,expectedStart_time,status,display")
          .eq("customer_id", cid)
          .eq("display", true)
          .in("status", ["Completed", "Cancelled"])
          .order("date", { ascending: false })
          .order("expectedStart_time", { ascending: false })
          .limit(50);
        if (txErr) throw txErr;

        // Feedback
        const { data: fbRows, error: fbErr } = await supabase
          .from("Feedback")
          .select(
            "feedback_id, appointment_id, created_at, rating, admin_response, customer_response, isDisplay"
          )
          .eq("isDisplay", true)
          .eq("customer_id", cid)
          .not("customer_response", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);
        if (fbErr) throw fbErr;

        // Resolve stylists & plans
        const upcomingIds = (upRows ?? []).map((r: any) => r.appointment_id);
        const txnIds = (txRows ?? []).map((r: any) => r.appointment_id);
        const fbIds = (fbRows ?? [])
          .map((r: any) => r.appointment_id)
          .filter(Boolean);
        const meta = await getAppointmentPeopleAndPlans([
          ...upcomingIds,
          ...txnIds,
          ...fbIds,
        ]);

        const toPlanString = (m?: {
          services?: string[];
          packages?: string[];
        }) =>
          m
            ? [...(m.services ?? []), ...(m.packages ?? [])]
                .filter(Boolean)
                .join(", ")
            : "";

        const upcomingList: Appointment[] = (upRows ?? []).map((r: any) => {
          const m = meta[String(r.appointment_id).trim()];
          return {
            id: r.appointment_id,
            datetime: toDateTimeLabel(
              r.date,
              String(r.expectedStart_time ?? "").slice(0, 5)
            ),
            service: toPlanString(m) || "—",
            status: r.status ?? "Booked",
          };
        });

        const txnList: Appointment[] = (txRows ?? []).map((r: any) => {
          const m = meta[String(r.appointment_id).trim()];
          return {
            id: r.appointment_id,
            datetime: toDateTimeLabel(
              r.date,
              String(r.expectedStart_time ?? "").slice(0, 5)
            ),
            service: toPlanString(m) || "—",
            status: r.status ?? "Completed",
          };
        });

        const fbList: Feedback[] = (fbRows ?? []).map((r: any) => {
          const key = r.appointment_id ? String(r.appointment_id).trim() : "";
          const m = key ? meta[key] : undefined;

          const dt =
            r.created_at &&
            new Date(r.created_at).toLocaleDateString("en-US", {
<<<<<<< HEAD
              month: "short",
=======
              month: "2-digit",
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
              day: "2-digit",
              year: "numeric",
            });

          return {
            id: r.feedback_id as string,
            appointmentId: r.appointment_id ?? null,
            date: dt,
            rating: Number(r.rating ?? 0) || undefined,
            text: r.customer_response ?? undefined,
            adminResponse: r.admin_response ?? undefined,
            stylist: m && m.stylists.length ? m.stylists.join(", ") : undefined,
            service: toPlanString(m) || undefined,
          };
        });

        if (!cancelled) {
          setUpcoming(upcomingList);
          setTransactions(txnList);
          setCustomerFeedbacks(fbList);
        }
      } catch (e) {
        console.error("Failed to load customer extras:", e);
        if (!cancelled) {
          setUpcoming(profile?.upcomingAppointments ?? []);
          setTransactions([]);
          setCustomerFeedbacks([]);
        }
      } finally {
        if (!cancelled) setLoadingExtra(false);
      }
    })();

    return () => {
<<<<<<< HEAD
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let _ = (cancelled = true);
=======
      cancelled = true;
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
    };
  }, [
    open,
    profile?.customer_id,
    profile?.upcomingAppointments,
    getAppointmentPeopleAndPlans,
  ]);

  if (!open || !profile) return null;
  const fullName = fullNameOf(profile);

  const statusPill = (s?: string) => {
    const v = (s || "").toLowerCase();
<<<<<<< HEAD
    if (v.includes("book"))
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (v.includes("complete"))
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (v.includes("cancel"))
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (v.includes("ongo"))
      return "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200";
    return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
=======
    if (v.includes("book")) return "bg-blue-100 text-blue-700";
    if (v.includes("complete")) return "bg-emerald-100 text-emerald-700";
    if (v.includes("cancel")) return "bg-rose-100 text-rose-700";
    if (v.includes("ongo")) return "bg-fuchsia-100 text-fuchsia-700";
    return "bg-gray-100 text-gray-700";
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  };

  const StarRow = ({ value = 0 }: { value?: number }) => {
    const r = Math.max(0, Math.min(5, Math.round(value)));
    return (
      <div
        className="flex items-center gap-1 text-amber-500"
        aria-label={`Average rating ${r} of 5`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="text-lg leading-none">
            {i < r ? "★" : "☆"}
          </span>
        ))}
      </div>
    );
  };

  const avgRating =
    customerFeedbacks.length > 0
      ? customerFeedbacks.reduce((s, f) => s + (f.rating || 0), 0) /
        customerFeedbacks.length
      : 0;

  return (
<<<<<<< HEAD
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-profile-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-6xl mx-3">
        <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100/80 px-6 py-4 bg-white/80 backdrop-blur">
            <div className="min-w-0">
              <h3
                id="customer-profile-title"
                className="truncate text-2xl font-bold tracking-tight"
              >
                Customer Profile
              </h3>
              <p className="text-xs text-gray-500">
                ID: {profile.customer_id ?? profile.userId ?? "—"}
=======
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-6xl max-h[90vh] overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-2xl font-bold">Customer Profile</h3>
          <div className="flex items-center gap-2">
            {profile.role !== "admin" ? (
              <button
                disabled={busy}
                onClick={() => onToggleBlock?.(profile)}
                className={`rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60 ${
                  profile.is_blocked
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-rose-600 text-white hover:bg-rose-700"
                }`}
              >
                {profile.is_blocked ? "Unblock" : "Block"}
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-64px)]">
          {loadingExtra && (
            <div className="mb-4 text-sm text-gray-500">Loading data…</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left card: Customer details */}
            <section className="rounded-2xl border p-6">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-amber-200 text-amber-700">
                <span className="text-4xl font-bold">
                  {fullName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <h4 className="text-center text-lg font-semibold">{fullName}</h4>
              <p className="mt-1 text-center text-xs text-gray-500">
                User ID: {profile.customer_id ?? profile.userId ?? "—"}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
              </p>
            </div>
            <div className="flex items-center gap-2">
              {profile.role !== "admin" ? (
                <button
                  disabled={busy}
                  onClick={() => onToggleBlock?.(profile)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 ${
                    profile.is_blocked
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300"
                      : "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300"
                  }`}
                >
                  {profile.is_blocked ? "Unblock" : "Block"}
                </button>
              ) : null}

              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-64px)]">
            {loadingExtra && (
              <div className="mb-4 text-sm text-gray-500 animate-pulse">
                Loading data…
              </div>
            )}

<<<<<<< HEAD
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left card: Customer details */}
              <section className="rounded-2xl border border-gray-100 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-300 text-amber-800 shadow-inner">
                  <span className="text-4xl font-black">
                    {fullName?.[0]?.toUpperCase() ?? "?"}
=======
            {/* Upcoming Appointments */}
            <section className="md:col-span-2 rounded-2xl border p-6">
              <h4 className="text-xl font-semibold">Upcoming Appointments</h4>
              <div className="mt-4 divide-y rounded-xl border bg-white max-h-56 overflow-y-auto">
                {upcoming.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">
                    No upcoming appointments.
                  </div>
                )}
                {upcoming.map((a, i) => (
                  <div
                    key={a.id ?? i}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {a.datetime ?? "—"}
                      </div>
                      {a.service && (
                        <div className="text-sm text-gray-500">
                          Service: {a.service}
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(
                        a.status
                      )}`}
                    >
                      {a.status ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Service Transactions */}
            <section className="md:col-span-3 rounded-2xl border p-6">
              <h4 className="text-xl font-semibold">Service Transactions</h4>
              <p className="mt-1 text-xs text-gray-500">
                Completed and Cancelled appointments
              </p>
              <div className="mt-4 divide-y rounded-xl border bg-white max-h-72 overflow-y-auto">
                {transactions.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">
                    No service transactions.
                  </div>
                )}
                {transactions.map((t, i) => (
                  <div
                    key={t.id ?? i}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {t.datetime ?? "—"}
                      </div>
                      {t.service && (
                        <div className="text-sm text-gray-500">
                          Service: {t.service}
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(
                        t.status
                      )}`}
                    >
                      {t.status ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Feedback History */}
            <section className="md:col-span-3 rounded-2xl border p-6">
              <div className="flex flex-wrap items-center justify-between">
                <h4 className="text-2xl font-bold">Feedback History</h4>
                <div className="flex items-center gap-3 text-sm text-gray-900">
                  <StarRow value={avgRating} />
                  <span className="font-semibold">
                    {avgRating.toFixed(1)} Average Rating
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
                  </span>
                </div>
                <h4 className="text-center text-lg font-semibold">
                  {fullName}
                </h4>
                <p className="mt-1 text-center text-xs text-gray-500">
                  User ID: {profile.customer_id ?? profile.userId ?? "—"}
                </p>

<<<<<<< HEAD
                <div className="mt-6 space-y-3 text-sm">
                  <div className="truncate">
                    <span className="font-medium text-gray-700">✉️ Email:</span>{" "}
                    <span className="text-gray-900">
                      {profile.email ?? "—"}
                    </span>
=======
              <div className="mt-4 space-y-6">
                {customerFeedbacks.length === 0 && (
                  <div className="text-sm text-gray-500">No feedback yet.</div>
                )}

                {customerFeedbacks.map((fb, i) => (
                  <div
                    key={fb.id ?? i}
                    className="pb-6 border-b last:border-b-0"
                  >
                    {/* Stars + date row */}
                    <div className="flex items-center justify-between">
                      <StarRow value={fb.rating ?? 0} />
                      <span className="text-sm text-gray-700">
                        {fb.date ?? "—"}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="mt-3 text-sm text-gray-800">
                      <span className="font-semibold">Stylist:</span>{" "}
                      {fb.stylist ?? "—"}
                      <span className="mx-4" />
                      <span className="font-semibold">Service:</span>{" "}
                      {fb.service ?? "—"}
                    </div>

                    {/* Customer text */}
                    {fb.text && <p className="mt-3 text-gray-900">{fb.text}</p>}

                    {/* Add Response OR Admin Response (read-only) */}
                    {!fb.adminResponse ? (
                      <button
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-500"
                        onClick={() => setRespondId(fb.id)}
                      >
                        <span className="text-lg leading-none">💬</span>
                        Add Response
                      </button>
                    ) : (
                      <div className="mt-4 rounded-2xl border bg-gray-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-gray-800 font-semibold">
                          <span className="text-lg">🛡️</span>
                          Admin Response
                        </div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                          {fb.adminResponse}
                        </div>
                      </div>
                    )}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">📞 Phone:</span>{" "}
                    <span className="text-gray-900">
                      {profile.phoneNumber ?? profile.phone ?? "—"}
                    </span>
                  </div>
                  {profile.address && (
                    <div className="truncate">
                      <span className="font-medium text-gray-700">
                        📍 Address:
                      </span>{" "}
                      <span className="text-gray-900">{profile.address}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">
                      📅 Joined:
                    </span>{" "}
                    <span className="text-gray-900">
                      {toDateLabel(profile.joined_at ?? profile.joined)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Upcoming Appointments */}
              <section className="md:col-span-2 rounded-2xl border border-gray-100 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
                <h4 className="text-xl font-semibold">Upcoming Appointments</h4>
                <div className="mt-4 divide-y rounded-xl border border-gray-100 bg-white max-h-56 overflow-y-auto">
                  {upcoming.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">
                      No upcoming appointments.
                    </div>
                  )}
                  {upcoming.map((a, i) => (
                    <div
                      key={a.id ?? i}
                      className="flex items-center justify-between p-4 hover:bg-amber-50/40 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {a.datetime ?? "—"}
                        </div>
                        {a.service && (
                          <div className="text-sm text-gray-600">
                            Service: {a.service}
                          </div>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPill(
                          a.status
                        )}`}
                      >
                        {a.status ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Service Transactions */}
              <section className="md:col-span-3 rounded-2xl border border-gray-100 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xl font-semibold">
                    Service Transactions
                  </h4>
                  <p className="text-xs text-gray-500">
                    Completed and Cancelled appointments
                  </p>
                </div>
                <div className="mt-4 divide-y rounded-xl border border-gray-100 bg-white max-h-72 overflow-y-auto">
                  {transactions.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">
                      No service transactions.
                    </div>
                  )}
                  {transactions.map((t, i) => (
                    <div
                      key={t.id ?? i}
                      className="flex items-center justify-between p-4 hover:bg-amber-50/40 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {t.datetime ?? "—"}
                        </div>
                        {t.service && (
                          <div className="text-sm text-gray-600">
                            Service: {t.service}
                          </div>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPill(
                          t.status
                        )}`}
                      >
                        {t.status ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Feedback History */}
              <section className="md:col-span-3 rounded-2xl border border-gray-100 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-2xl font-bold">Feedback History</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-900">
                    <StarRow value={avgRating} />
                    <span className="font-semibold">
                      {avgRating.toFixed(1)} Average Rating
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-6">
                  {customerFeedbacks.length === 0 && (
                    <div className="text-sm text-gray-500">
                      No feedback yet.
                    </div>
                  )}

                  {customerFeedbacks.map((fb, i) => (
                    <div
                      key={fb.id ?? i}
                      className="pb-6 border-b border-gray-100 last:border-b-0"
                    >
                      {/* Stars + date row */}
                      <div className="flex items-center justify-between">
                        <StarRow value={fb.rating ?? 0} />
                        <span className="text-sm text-gray-700">
                          {fb.date ?? "—"}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="mt-3 text-sm text-gray-800">
                        <span className="font-semibold">Stylist:</span>{" "}
                        {fb.stylist ?? "—"}
                        <span className="mx-4" />
                        <span className="font-semibold">Service:</span>{" "}
                        {fb.service ?? "—"}
                      </div>

                      {/* Customer text */}
                      {fb.text && (
                        <p className="mt-3 text-gray-900 whitespace-pre-wrap">
                          {fb.text}
                        </p>
                      )}

                      {/* Add Response OR Admin Response */}
                      {!fb.adminResponse ? (
                        <button
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
                          onClick={() => setRespondId(fb.id)}
                        >
                          <span className="text-lg leading-none">💬</span>
                          Add Response
                        </button>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="mb-2 flex items-center gap-2 text-gray-800 font-semibold">
                            <span className="text-lg">🛡️</span>
                            Admin Response
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {fb.adminResponse}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Respond modal */}
=======
      {/* Respond modal (FeedbackForm). If already replied, it shows read-only. */}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      {respondId && (
        <FeedbackForm
          key={respondId}
          feedbackId={respondId}
          onClose={closeRespond}
          onSave={async ({ comment }) => {
            setCustomerFeedbacks((prev) =>
              prev.map((f) =>
                f.id === respondId ? { ...f, adminResponse: comment } : f
              )
            );
            closeRespond();
          }}
        />
      )}
    </div>
  );
};

// ---------- Page ----------
const AdminCustomers = () => {
  const [postsPerPage, setPostsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { paginatedCustomers, fetchPaginatedCustomers, loading } =
    usePaginationContext();

  const startingIndex = (currentPage - 1) * postsPerPage;
  const endingIndex = startingIndex + postsPerPage - 1;

  useEffect(() => {
    fetchPaginatedCustomers(startingIndex, endingIndex).catch((err: unknown) =>
      console.error("Failed to fetch customers:", err)
    );
  }, [startingIndex, endingIndex, fetchPaginatedCustomers]);

  const list = (paginatedCustomers ?? []).filter((c: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(c.firstName ?? c.name ?? "")
        .toLowerCase()
        .includes(q) ||
      String(c.email ?? "")
        .toLowerCase()
        .includes(q) ||
      String(c.phone ?? c.phoneNumber ?? "")
        .toLowerCase()
        .includes(q)
    );
  });

  const getId = (c: any) => c.customer_id ?? c.id;

  /** ===== Completed Appointments count (per visible page) ===== */
  const [completedCounts, setCompletedCounts] = useState<
    Record<string, number>
  >({});

  const visibleIds = useMemo(
    () => list.map((c: any) => getId(c)).filter(Boolean) as string[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.length, query, currentPage, postsPerPage]
  );
  const visibleIdsKey = useMemo(
    () => visibleIds.sort().join(","),
    [visibleIds]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (visibleIds.length === 0) {
        if (!cancelled) setCompletedCounts({});
        return;
      }

      const { data, error } = await supabase
        .from("Appointments")
        .select("customer_id, appointment_id, status, display")
        .in("customer_id", visibleIds)
        .eq("status", "Completed");

      if (error) {
        console.error("Failed to load completed counts:", error);
        if (!cancelled) setCompletedCounts({});
        return;
      }

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if ((row as any).display === false) continue;
        const cid = (row as any).customer_id as string;
        counts[cid] = (counts[cid] ?? 0) + 1;
      }

      if (!cancelled) setCompletedCounts(counts);
    })();

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let _ = (cancelled = true);
    };
  }, [visibleIdsKey, visibleIds]);

  const selectedProfile = useMemo(
    () =>
      list.find((c: any) => getId(c) === profileId) as ProfileLike | undefined,
    [list, profileId]
  );

  const handleToggleBlock = async (customer: ProfileLike) => {
    if (customer.role === "admin") {
      alert("Admins cannot be blocked.");
      return;
    }

    const id = (customer.customer_id ?? (customer as any).id) as string;
    const authUserId =
      customer.customer_id ??
      (customer as any).customer_id ??
      (customer as any).customer_id ??
      customer.userId;

    if (!authUserId) {
      alert(
        "Missing auth_user_id for this customer. Please include it in your select()/query."
      );
      return;
    }

    const next = !(customer.is_blocked ?? false);

    try {
      setBusyId(id);
      (customer as any).is_blocked = next;
      await setCustomerBlocked(id, authUserId, next);
      await fetchPaginatedCustomers(startingIndex, endingIndex);
    } catch (err: any) {
      (customer as any).is_blocked = !next;
      console.error("Failed to update block status:", err?.message || err);
      alert(err?.message || "Failed to update block status. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Customer Management</h1>
      <p className="text-gray-500 mt-2">
        Manage your customer database and view detailed information
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span>Show</span>
          <select
            value={postsPerPage}
            onChange={(e) => {
              setCurrentPage(1);
              setPostsPerPage(Number(e.target.value));
            }}
            className="rounded-xl border border-gray-300 px-3 py-2"
          >
            {[5, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>entries</span>
        </div>
        <div className="relative w-full sm:w-72">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* Modernized table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white/70 shadow-sm backdrop-blur-sm">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-left">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
              <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Completed</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>

<<<<<<< HEAD
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    Loading…
=======
                      {c.role !== "admin" && (
                        <button
                          disabled={busyId === getId(c)}
                          onClick={() => handleToggleBlock(c as ProfileLike)}
                          className={`px-3 py-1 rounded-xl text-sm font-medium disabled:opacity-60 ${
                            c.is_blocked
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-rose-600 text-white hover:bg-rose-700"
                          }`}
                        >
                          {c.is_blocked ? "Unblock" : "Block"}
                        </button>
                      )}
                    </div>
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
                  </td>
                </tr>
              )}

              {!loading &&
                list.map((c: any, idx: number) => {
                  const id = c.customer_id ?? c.id;
                  const completed = completedCounts[id] ?? 0;

                  return (
                    <tr
                      key={id}
                      className={[
                        "transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-amber-50/30",
                        "hover:bg-amber-50/60",
                      ].join(" ")}
                    >
                      {/* Name */}
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {fullNameOf(c)}
                        </div>
                        {(c.role || c.username) && (
                          <div className="text-xs text-gray-500">
                            {c.role || c.username}
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3">
                        <div className="max-w-[260px] truncate text-gray-800">
                          {c.email ?? "—"}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3 text-gray-800">
                        {c.phoneNumber ?? c.phone ?? "—"}
                      </td>

                      {/* Completed badge */}
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                          {completed}
                        </span>
                      </td>

                      {/* Joined chip with normalized date */}
                      <td className="px-1 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 ring-1 ring-gray-200/70">
                          {toDateLabel(c.joined_at ?? c.joined)}
                        </span>
                      </td>

                      {/* Status pill */}
                      <td className="px-5 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
                            c.is_blocked
                              ? "bg-rose-50 text-rose-700 ring-rose-200/60"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
                          ].join(" ")}
                        >
                          {c.is_blocked ? "Blocked" : "Active"}
                        </span>
                      </td>

                      {/* Actions aligned right */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="View"
                            onClick={() => setProfileId(id)}
                            className="inline-flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </button>

                          {c.role !== "admin" && (
                            <button
                              disabled={busyId === id}
                              onClick={() =>
                                handleToggleBlock(c as ProfileLike)
                              }
                              className={[
                                "px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-60 focus:outline-none focus:ring-2",
                                c.is_blocked
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300"
                                  : "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300",
                              ].join(" ")}
                            >
                              {c.is_blocked ? "Unblock" : "Block"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && list.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No customers to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {profileId && (
        <ViewProfileModal
          open={!!profileId}
          onClose={() => setProfileId(null)}
          profile={
            (list.find((c: any) => (c.customer_id ?? c.id) === profileId) ??
              null) as ProfileLike | null
          }
          onToggleBlock={(c) => handleToggleBlock(c)}
          busy={busyId === profileId}
        />
      )}
    </div>
  );
};

export default AdminCustomers;
