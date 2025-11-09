// CustomerAppointments.tsx
import React, { useEffect, useState, useCallback } from "react";
import BookAppointment from "@/public-components/BookAppointments";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/lib/supabaseclient";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";

<<<<<<< HEAD
=======
// 👉 Import your separate table component and its row type
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
import CustomerAppointmentHistory, {
  type AppointmentRow as HistoryRow,
} from "@/features/appointments/components/customer-appointment-history";

type ApptCard = {
  appointment_id: string;
  date: string; // YYYY-MM-DD
  expectedStart_time: string; // HH:MM
  expectedEnd_time: string; // HH:MM
  status: string | null;
  comments?: string | null;
};

type DetailMeta = { label: string; value: string };

const calendarStyles = `
  .react-datepicker { font-size: 16px; border-radius: 16px; padding: 12px; }
  .react-datepicker__day, .react-datepicker__day-name, .react-datepicker__current-month {
    font-size: 16px; border-radius: 8px;
  }
  .react-datepicker__header { border-top-left-radius: 16px; border-top-right-radius: 16px; }
`;

/* ---------- helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const to12h = (hhmm: string) => {
  const [hS, mS] = hhmm.split(":");
  let h = Number(hS);
  const m = Number(mS || 0);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)}${ap}`;
};
const takeHHMM = (t: string) => String(t).slice(0, 5);
const fmtDateLong = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};
<<<<<<< HEAD
=======
// for table: "13/05/2025"
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
const fmtDDMMYYYY = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${pad(d)}/${pad(m)}/${y}`;
};
const peso = (v: number | null | undefined) =>
  v == null || Number.isNaN(Number(v))
    ? "—"
    : `₱${Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const CustomerAppointments: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [appts, setAppts] = useState<ApptCard[]>([]);

  // cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [toCancel, setToCancel] = useState<ApptCard | null>(null);

  // update modal state
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateComments, setUpdateComments] = useState("");
  const [toUpdate, setToUpdate] = useState<ApptCard | null>(null);
  const [updateDetails, setUpdateDetails] = useState<DetailMeta[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { user } = useAuthContext();
  const {
    updateAppointment,
    loadUpcomingCustomerAppointments,
<<<<<<< HEAD
    getAppointmentPeopleAndPlans,
    loadCustomerAppointmentHistory, // ✅ now returns payment_method
=======
    // used by history section
    getAppointmentPeopleAndPlans,
    loadCustomerAppointmentHistory,
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
    deleteAppointmentCascade,
  } = useAppointments();

  /* responsive */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* load upcoming (Booked-only) */
  const loadMine = useCallback(async () => {
    if (!user?.id) {
      setAppts([]);
      return;
    }
    try {
      setLoading(true);
      setErr(null);

      const rows = await loadUpcomingCustomerAppointments(user.id);
      const cleaned: ApptCard[] = (rows ?? []).map((r: any) => ({
        appointment_id: r.appointment_id,
        date: r.date,
        expectedStart_time: takeHHMM(r.expectedStart_time),
        expectedEnd_time: takeHHMM(r.expectedEnd_time),
        status: r.status ?? "Booked",
        comments: undefined,
      }));
      setAppts(cleaned);
    } catch (e: any) {
      console.error("loadMine error", e);
      setErr(e?.message || "Failed to load your appointments.");
      setAppts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUpcomingCustomerAppointments]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  /* called by BookAppointment when a new booking is made */
  const handleBooked = async () => {
    await loadMine();
<<<<<<< HEAD
    await reloadHistory();
=======
    await reloadHistory(); // keep table fresh after new booking completes later
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  };

  /* ---------- Cancel flow ---------- */
  const openCancel = async (a: ApptCard) => {
    try {
      const { data, error } = await supabase
        .from("Appointments")
        .select("comments")
        .eq("appointment_id", a.appointment_id)
        .single();
      if (error) throw error;
      setToCancel({ ...a, comments: data?.comments ?? null });
    } catch {
      setToCancel({ ...a, comments: a.comments ?? null });
    } finally {
      setCancelReason("");
      setCancelOpen(true);
    }
  };
  const closeCancel = () => {
    setCancelOpen(false);
    setToCancel(null);
    setCancelReason("");
  };
  const confirmCancel = async () => {
    if (!toCancel) return;
    try {
      const patch: any = { status: "Cancelled" };
      if (cancelReason?.trim()) {
        const prev = toCancel.comments || "";
        patch.comments = prev
          ? `${prev}\n\n[Cancelled reason]: ${cancelReason.trim()}`
          : `[Cancelled reason]: ${cancelReason.trim()}`;
      }
      await updateAppointment(toCancel.appointment_id, patch);
      setAppts((prev) =>
        prev.filter((x) => x.appointment_id !== toCancel.appointment_id)
      );
      closeCancel();
      await reloadHistory();
    } catch (e: any) {
      alert(e?.message || "Failed to cancel appointment.");
    }
  };

  /* ---------- Update flow ---------- */
  const openUpdate = async (a: ApptCard) => {
    setToUpdate(a);
    setUpdateOpen(true);
    setDetailsLoading(true);
    setUpdateDetails(null);

    try {
      const [{ data: apptRow }, { data: sp }, linkRes] = await Promise.all([
        supabase
          .from("Appointments")
          .select("comments")
          .eq("appointment_id", a.appointment_id)
          .single(),
        supabase
          .from("AppointmentServicePlan")
          .select("service_id,package_id")
          .eq("appointment_id", a.appointment_id)
          .single(),
        supabase
          .from("AppointmentStylists")
          .select("stylist_id")
          .eq("appointment_id", a.appointment_id)
          .maybeSingle(),
      ]);

      setUpdateComments(apptRow?.comments ?? "");

      // Service/Package
      let serviceName = "";
      let durationText = "—";
      let priceText = "—";

      if (sp?.service_id) {
        const { data: s } = await supabase
          .from("Services")
          .select("name,duration,min_price,max_price")
          .eq("service_id", sp.service_id)
          .single();
        if (s) {
          serviceName = s.name;
          durationText = s.duration ? `${s.duration} mins` : "—";
          if (s.min_price != null && s.max_price != null) {
            priceText =
              s.min_price === s.max_price
                ? `₱${s.min_price}`
                : `₱${s.min_price} - ₱${s.max_price}`;
          } else if (s.min_price != null || s.max_price != null) {
            priceText = `₱${(s.min_price ?? s.max_price) as number}`;
          }
        }
      } else if (sp?.package_id) {
        const { data: p } = await supabase
          .from("Package")
          .select("name,expected_duration,price")
          .eq("package_id", sp.package_id)
          .single();
        if (p) {
          serviceName = p.name;
          durationText = p.expected_duration
            ? `${p.expected_duration} mins`
            : "—";
          priceText =
            p.price != null && !Number.isNaN(p.price) ? `₱${p.price}` : "—";
        }
      }

      // Stylist
      let stylistName = "—";
      if (linkRes?.data?.stylist_id) {
        const { data: st } = await supabase
          .from("Stylists")
          .select("name")
          .eq("stylist_id", linkRes.data.stylist_id)
          .single();
        if (st?.name) stylistName = st.name;
      }

      setUpdateDetails([
        { label: "Service", value: serviceName || "—" },
        { label: "Duration", value: durationText },
        { label: "Stylist", value: stylistName },
        { label: "Price", value: priceText },
      ]);
    } catch {
      setUpdateDetails([
        { label: "Service", value: "—" },
        { label: "Duration", value: "—" },
        { label: "Stylist", value: "—" },
        { label: "Price", value: "—" },
      ]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeUpdate = () => {
    setUpdateOpen(false);
    setToUpdate(null);
    setUpdateComments("");
    setUpdateDetails(null);
    setDetailsLoading(false);
  };

  const confirmUpdate = async () => {
    if (!toUpdate) return;
    try {
      const comment = updateComments.trim();
      await updateAppointment(toUpdate.appointment_id, {
        comments: comment ? comment : null,
      });
      setAppts((prev) =>
        prev.map((x) =>
          x.appointment_id === toUpdate.appointment_id
            ? { ...x, comments: comment || null }
            : x
        )
      );
      closeUpdate();
      await reloadHistory();
    } catch (e: any) {
      alert(e?.message || "Failed to update appointment.");
    }
  };

<<<<<<< HEAD
  /* -------------------- History (table) -------------------- */
=======
  /* -------------------- History state (for separate table) -------------------- */
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  type TabKey = "ALL" | "COMPLETED" | "CANCELLED";
  const [histTab, setHistTab] = useState<TabKey>("ALL");
  const [histPerPage, setHistPerPage] = useState<number>(5);
  const [histPage, setHistPage] = useState<number>(1);
  const [histSearch, setHistSearch] = useState<string>("");
  const [histTotalPages, setHistTotalPages] = useState<number>(1);
  const [histRows, setHistRows] = useState<HistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState<boolean>(false);

  const reloadHistory = useCallback(async () => {
    if (!user?.id) {
      setHistRows([]);
      setHistTotalPages(1);
      return;
    }

    try {
      setHistLoading(true);

      const statusFilter =
        histTab === "COMPLETED"
          ? "Completed"
          : histTab === "CANCELLED"
          ? "Cancelled"
          : undefined;

      const { items, total } = await loadCustomerAppointmentHistory({
        customer_id: user.id,
        page: histPage,
        pageSize: histPerPage,
<<<<<<< HEAD
        // client-side search; no server term
        search: undefined,
        status: statusFilter,
      });

      // enrich
      const ids = items.map((r: any) => r.id);
      const meta = await getAppointmentPeopleAndPlans(ids);

      // Map to table rows (show payment method)
=======
        search: histSearch || undefined, // server can still search status/comments
        status: statusFilter,
      });

      // enrich with stylist/service names
      const ids = items.map((r: any) => r.id);
      const meta = await getAppointmentPeopleAndPlans(ids);

      // Map to table rows
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      const mapped: HistoryRow[] = items.map((r: any) => {
        const stylists = meta[r.id]?.stylists ?? [];
        const services = meta[r.id]?.services ?? [];
        const packages = meta[r.id]?.packages ?? [];
        const planName =
          services.concat(packages).join(", ") || (r.plan ?? "—");
<<<<<<< HEAD

        // ✅ prefer precise DB field coming from the hook
        const payment =
          r.payment_method != null && r.payment_method !== ""
            ? r.payment_method
            : r.paymentMode || "—";
=======
        const payment = r.payment_method || r.paymentMode || "—";
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785

        return {
          id: r.id,
          service: planName || "—",
          stylist: stylists.join(", ") || "—",
          date: fmtDDMMYYYY(r.service_date),
          amount: peso(r.total_amount),
          paymentMode: String(payment),
          status: r.status === "Cancelled" ? "Cancelled" : "Completed",
        };
      });

<<<<<<< HEAD
      setHistRows(mapped);
      setHistTotalPages(
        Math.max(1, Math.ceil((total ?? mapped.length) / histPerPage))
      );
=======
      // ----- CLIENT-SIDE SEARCH FIX -----
      const q = (histSearch || "").trim().toLowerCase();
      const filtered = q
        ? mapped.filter((row) => {
            const hay = [
              row.service,
              row.stylist,
              row.date,
              row.amount,
              row.paymentMode,
              row.status,
            ]
              .join(" ")
              .toLowerCase();
            return hay.includes(q);
          })
        : mapped;

      setHistRows(filtered);

      // If client search is active, clamp to a single page for honesty
      if (q) {
        setHistTotalPages(1);
      } else {
        setHistTotalPages(
          Math.max(1, Math.ceil((total ?? mapped.length) / histPerPage))
        );
      }
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
    } catch (e) {
      console.error("history load error", e);
      setHistRows([]);
      setHistTotalPages(1);
    } finally {
      setHistLoading(false);
    }
  }, [
    user?.id,
    histPage,
    histPerPage,
<<<<<<< HEAD
=======
    histSearch,
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
    histTab,
    loadCustomerAppointmentHistory,
    getAppointmentPeopleAndPlans,
  ]);

  useEffect(() => {
    void reloadHistory();
<<<<<<< HEAD
=======
    // eslint-disable-next-line react-hooks/exhaustive-deps
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  }, [reloadHistory]);

  const handleDeleteHistory = async (id: string) => {
    const ok = confirm(
      "Delete this appointment permanently? This cannot be undone."
    );
    if (!ok) return;
    try {
      await deleteAppointmentCascade(id);
<<<<<<< HEAD
=======
      // If we just deleted the last item on a page > 1, step back a page
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      if (histRows.length === 1 && histPage > 1) {
        setHistPage((p) => p - 1);
      } else {
        await reloadHistory();
      }
      await loadMine();
    } catch (e: any) {
      alert(e?.message || "Failed to delete appointment.");
    }
  };

  return (
    <>
      <style>{calendarStyles}</style>

<<<<<<< HEAD
      {/* Booking + Upcoming */}
=======
      {/* ORIGINAL LAYOUT: row on desktop, column on mobile */}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      <div
        className="appointments-wrapper"
        style={{
          padding: isMobile ? "30px 20px" : "40px 100px",
          background: "#f5f5f5",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
          gap: isMobile ? "40px" : "80px",
          justifyContent: "space-between",
        }}
      >
        <BookAppointment
          onBooked={handleBooked}
          customerId={user?.id ?? null}
        />

<<<<<<< HEAD
=======
        {/* Appointments (unchanged) */}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
        <div
          style={{
            flex: 0.9,
            minWidth: "300px",
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            maxHeight: isMobile ? "60vh" : "70vh",
          }}
        >
          <h2
            style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}
          >
            My Upcoming Appointments
          </h2>

          <div
            aria-label="Upcoming appointments"
            style={{
              overflowY: "auto",
              paddingRight: 6,
              maxHeight: "100%",
              overscrollBehavior: "contain",
            }}
          >
            {loading ? (
              <p style={{ color: "#6b7280" }}>Loading…</p>
            ) : err ? (
              <p style={{ color: "#b91c1c" }}>{err}</p>
            ) : appts.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No upcoming appointments.</p>
            ) : (
              appts.map((a) => (
                <div
                  key={a.appointment_id}
                  style={{
                    border: "1px solid #eee",
                    padding: "18px",
                    borderRadius: "16px",
                    marginBottom: "18px",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                    <span role="img" aria-label="calendar">
                      📅
                    </span>
                    <strong style={{ fontSize: 18 }}>
                      {fmtDateLong(a.date)}
                    </strong>
                  </div>

                  <div style={{ marginBottom: 12, fontSize: 16 }}>
                    {to12h(a.expectedStart_time)} — {to12h(a.expectedEnd_time)}
                  </div>

                  <div
                    style={{
                      marginBottom: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#f59e0b",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      Notes:{" "}
                      <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                        {a.comments ?? "—"}
                      </span>
                    </span>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "#f59e0b",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                      onClick={() => openUpdate(a)}
                    >
                      Update
                    </button>
                  </div>

                  <button
                    onClick={() => openCancel(a)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "#FFB030",
                      color: "#fff",
                      fontWeight: 800,
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel Appointment
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* History */}
=======
      {/* HISTORY AT THE VERY BOTTOM (outside the row wrapper) */}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      <div
        style={{
          padding: isMobile ? "0 20px 30px" : "0 100px 40px",
          background: "#f5f5f5",
        }}
      >
        <CustomerAppointmentHistory
          title="Appointment History"
          rows={histRows}
          activeTab={histTab}
          onTabChange={(t) => {
            setHistTab(t);
            setHistPage(1);
          }}
          perPageOptions={[5, 10, 25]}
          perPage={histPerPage}
          onPerPageChange={(n) => {
            setHistPerPage(n);
            setHistPage(1);
          }}
<<<<<<< HEAD
          /* Client-side search inside the table */
          searchMode="client"
          searchText={histSearch} // optional: keep if you want to control/clear externally
=======
          searchText={histSearch}
          onSearchTextChange={(v) => {
            setHistSearch(v);
            setHistPage(1);
          }}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
          page={histPage}
          totalPages={histTotalPages}
          onPageChange={(p) => setHistPage(p)}
          onDelete={handleDeleteHistory}
          emptyText={histLoading ? "Loading…" : "No appointments found."}
        />
      </div>

<<<<<<< HEAD
      {/* Cancel Modal */}
=======
      {/* Cancel Confirmation Modal */}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      {cancelOpen && toCancel && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeCancel}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 60,
          }}
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
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
              Cancel Appointment
            </h3>

            <p style={{ color: "#374151", marginBottom: 16, lineHeight: 1.5 }}>
              Are you sure you want to cancel your appointment on{" "}
              <b>{fmtDateLong(toCancel.date)}</b>,{" "}
              <b>
                {to12h(toCancel.expectedStart_time)} –{" "}
                {to12h(toCancel.expectedEnd_time)}
              </b>
              ?
            </p>

            <label
              style={{
                display: "block",
                marginBottom: 6,
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              Reason for Cancellation (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #111",
                borderRadius: 12,
                resize: "vertical",
                marginBottom: 16,
              }}
              placeholder="Let us know why you’re cancelling…"
            />

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <button
                onClick={closeCancel}
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "#FFB030",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Keep Appointment
              </button>
              <button
                onClick={confirmCancel}
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {updateOpen && toUpdate && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeUpdate}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 70,
          }}
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
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
              Update Appointment
            </h3>

            <p style={{ color: "#374151", marginBottom: 18 }}>
              Update comments for your appointment on{" "}
              <b>{fmtDateLong(toUpdate.date)}</b> at{" "}
              <b>
                {to12h(toUpdate.expectedStart_time)} -{" "}
                {to12h(toUpdate.expectedEnd_time)}
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
              {detailsLoading ? (
                <div style={{ color: "#6b7280" }}>Loading details…</div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    rowGap: 8,
                  }}
                >
                  {(updateDetails ?? []).map((d) => (
                    <FragmentRow
                      key={d.label}
                      label={d.label}
                      value={d.value}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Additional Comments (optional)
              </label>
              <textarea
                value={updateComments}
                onChange={(e) => setUpdateComments(e.target.value)}
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
                onClick={closeUpdate}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "#eee",
                  color: "#111",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "#FFB030",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* Small row fragment for the update modal */
const FragmentRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <>
    <span>{label}</span>
    <span>{value}</span>
  </>
);

export default CustomerAppointments;
