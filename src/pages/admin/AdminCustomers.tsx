// components/AdminCustomers.tsx
import { useEffect, useMemo, useState } from "react";
import { usePaginationContext } from "@/public-context/PaginationContext";
import { ExternalLink, X } from "lucide-react";
import { type Customer } from "@/features/auth/types/AuthTypes";

import { setCustomerBlocked } from "@/features/auth/hooks/UseUserProfile"; // Weak security, but needed for admin actions

// ---------- Types ----------
type Appointment = {
  id?: string;
  datetime?: string;
  service?: string;
  status?: string; // Booked | Completed | Cancelled
};

type ServiceTxn = {
  id?: string;
  datetime?: string;
  service?: string;
  stylist?: string;
  status?: string; // Completed | Cancelled
};

type Feedback = {
  id?: string;
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
  transactions?: ServiceTxn[];
  packages?: Array<{ id?: string; name: string; note?: string }>;
  feedbacks?: Feedback[];
  is_blocked?: boolean; // important
  auth_user_id?: string; // ✅ needed to call setCustomerBlocked
  role?: string; // ✅ "admin" | "customer" | etc.
};

// ---------- Helpers ----------
const fullNameOf = (c: any) =>
  [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") ||
  c.name ||
  "Unknown";

const toDateLabel = (d?: string) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
};

// ---------- View Profile Modal ----------
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
  if (!open || !profile) return null;
  const fullName = fullNameOf(profile);

  const appts: Appointment[] = profile.upcomingAppointments ?? [];
  const txns: ServiceTxn[] = profile.transactions ?? [];
  const pkgs = profile.packages ?? [];
  const fbs: Feedback[] = profile.feedbacks ?? [];

  const statusPill = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v.includes("book")) return "bg-blue-100 text-blue-700";
    if (v.includes("complete")) return "bg-emerald-100 text-emerald-700";
    if (v.includes("cancel")) return "bg-rose-100 text-rose-700";
    return "bg-gray-100 text-gray-700";
  };

  const StarRow = ({ value = 0 }: { value?: number }) => {
    const r = Math.max(0, Math.min(5, Math.round(value)));
    return (
      <div className="flex items-center gap-1 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>{i < r ? "★" : "☆"}</span>
        ))}
      </div>
    );
  };

  const avgRating =
    fbs.length > 0
      ? fbs.reduce((s, f) => s + (f.rating || 0), 0) / fbs.length
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-6xl max-h[90vh] overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-2xl font-bold">Customer Profile</h3>
          <div className="flex items-center gap-2">
            {/* Hide Block/Unblock for admins */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left card */}
            <section className="rounded-2xl border p-6">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-amber-200 text-amber-700">
                <span className="text-4xl font-bold">
                  {fullName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <h4 className="text-center text-lg font-semibold">{fullName}</h4>
              <p className="mt-1 text-center text-xs text-gray-500">
                User ID: {profile.customer_id ?? profile.userId ?? "—"}
              </p>

              <div className="mt-6 space-y-3 text-sm">
                <div className="truncate">
                  <span className="font-medium">✉️ Email:</span>{" "}
                  {profile.email ?? "—"}
                </div>
                <div>
                  <span className="font-medium">📞 Phone:</span>{" "}
                  {profile.phoneNumber ?? profile.phone ?? "—"}
                </div>
                {profile.address && (
                  <div className="truncate">
                    <span className="font-medium">📍 Address:</span>{" "}
                    {profile.address}
                  </div>
                )}
                <div>
                  <span className="font-medium">📅 Joined:</span>{" "}
                  {toDateLabel(profile.joined_at ?? profile.joined)}
                </div>
              </div>
            </section>

            {/* Upcoming Appointments */}
            <section className="md:col-span-2 rounded-2xl border p-6">
              <h4 className="text-xl font-semibold">Upcoming Appointments</h4>
              <div className="mt-4 divide-y rounded-xl border bg-white max-h-56 overflow-y-auto">
                {appts.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">
                    No upcoming appointments.
                  </div>
                )}
                {appts.map((a, i) => (
                  <div
                    key={a.id ?? i}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {a.datetime ?? "—"}
                      </div>
                      <div className="text-sm text-gray-500">
                        Service: {a.service ?? "—"}
                      </div>
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

            {/* Transactions */}
            <section className="rounded-2xl border p-6">
              <h4 className="text-lg font-semibold">
                Service Transaction History
              </h4>
              <div className="mt-3 rounded-xl border bg-white max-h-56 overflow-y-auto">
                {txns.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">
                    No transactions.
                  </div>
                )}
                {txns.map((t, i) => (
                  <div
                    key={t.id ?? i}
                    className="flex items-center justify-between gap-3 p-4 border-b last:border-b-0"
                  >
                    <div className="text-sm">
                      <div className="text-gray-800">{t.datetime ?? "—"}</div>
                      <div className="text-gray-600">
                        Service: {t.service ?? "—"}
                      </div>
                      {t.stylist && (
                        <div className="text-gray-600">
                          Stylist: {t.stylist}
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

            {/* Packages */}
            <section className="rounded-2xl border p-6">
              <h4 className="text-lg font-semibold">Available Packages</h4>
              <div className="mt-3 space-y-3 max-h-56 overflow-y-auto">
                {pkgs.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No packages available.
                  </div>
                )}
                {pkgs.map((p) => (
                  <div key={p.id ?? p.name} className="rounded-xl border p-3">
                    <div className="font-medium">{p.name}</div>
                    {p.note && (
                      <div className="text-sm text-gray-500">{p.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Feedback */}
            <section className="md:col-span-3 rounded-2xl border p-6">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <h4 className="text-xl font-semibold">Feedback History</h4>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <StarRow value={avgRating} />
                  <span className="text-gray-600">
                    {avgRating.toFixed(1)} Average Rating
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-4 max-h-72 overflow-y-auto">
                {fbs.length === 0 && (
                  <div className="text-sm text-gray-500">No feedback yet.</div>
                )}
                {fbs.map((fb, i) => (
                  <div key={fb.id ?? i} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <StarRow value={fb.rating ?? 0} />
                      <span className="ml-2">{fb.date ?? "—"}</span>
                      {fb.stylist && <span>• Stylist: {fb.stylist}</span>}
                      {fb.service && <span>• Service: {fb.service}</span>}
                    </div>
                    {fb.text && (
                      <p className="mt-2 text-sm text-gray-800">{fb.text}</p>
                    )}
                    {fb.adminResponse && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
                        <div className="font-medium mb-1">Admin Response</div>
                        {fb.adminResponse}
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
  );
};

// ---------- Page ----------
const AdminCustomers = () => {
  const [postsPerPage, setPostsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // for disabling buttons

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
  const selectedProfile = useMemo(
    () =>
      list.find((c: any) => getId(c) === profileId) as ProfileLike | undefined,
    [list, profileId]
  );

  // -- Toggle block/unblock (table & modal) via server action
  const handleToggleBlock = async (customer: ProfileLike) => {
    // Guard: never block admins (defense in depth)
    if (customer.role === "admin") {
      alert("Admins cannot be blocked.");
      return;
    }

    const id = (customer.customer_id ?? (customer as any).id) as string;

    // Try the common fields for the Supabase Auth user id
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
      // optimistic UI in table & modal
      (customer as any).is_blocked = next;

      // 🔒 Calls server-side function that uses supabaseAdmin
      await setCustomerBlocked(id, authUserId, next);

      // refresh page slice to sync badges/buttons
      await fetchPaginatedCustomers(startingIndex, endingIndex);
    } catch (err: any) {
      // rollback optimistic flip
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

      <div className="mt-6 overflow-hidden rounded-2xl border border-amber-100">
        <table className="min-w-full divide-y divide-amber-100">
          <thead className="bg-amber-50/60">
            <tr className="text-left text-sm text-gray-600">
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Phone</th>
              <th className="px-6 py-3 font-semibold">Appointments</th>
              <th className="px-6 py-3 font-semibold">Joined</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              list.map((c: any, idx: number) => (
                <tr
                  key={getId(c)}
                  className={`text-sm ${
                    idx % 2 === 0 ? "bg-amber-50/40" : "bg-white"
                  }`}
                >
                  <td className="px-6 py-4 font-medium">{fullNameOf(c)}</td>
                  <td className="px-6 py-4">
                    <div className="max-w-[260px] truncate text-gray-700">
                      {c.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">{c.phoneNumber ?? c.phone}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-emerald-50 px-2 text-emerald-700 font-medium">
                      {c.appointments ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                      {toDateLabel(c.joined_at ?? c.joined)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        c.is_blocked
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.is_blocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        title="View"
                        onClick={() => setProfileId(getId(c))}
                        className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100 transition"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </button>

                      {/* Hide Block/Unblock button for admins */}
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
                  </td>
                </tr>
              ))}
            {!loading && list.length === 0 && (
              <tr>
                <td
                  className="px-6 py-10 text-center text-gray-500"
                  colSpan={7}
                >
                  No customers to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ViewProfileModal
        open={!!profileId}
        onClose={() => setProfileId(null)}
        profile={selectedProfile ?? null}
        onToggleBlock={(c) => handleToggleBlock(c)}
        busy={
          busyId ===
          (selectedProfile
            ? selectedProfile.customer_id ?? (selectedProfile as any).id
            : null)
        }
      />
    </div>
  );
};

export default AdminCustomers;
