// CustomerAppointments.tsx
import { useEffect, useState, useCallback } from "react";
import BookAppointment from "@/public-components/BookAppointments";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/lib/supabaseclient";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";

type ApptCard = {
  appointment_id: string;
  date: string; // YYYY-MM-DD
  expectedStart_time: string; // HH:MM
  expectedEnd_time: string; // HH:MM
  comments: string | null;
  status: string | null;
};

type DetailMeta = { label: string; value: string };

const calendarStyles = `
  .react-datepicker {
    font-size: 16px;
    border-radius: 16px;
    padding: 12px;
  }
  .react-datepicker__day,
  .react-datepicker__day-name,
  .react-datepicker__current-month {
    font-size: 16px;
    border-radius: 8px;
  }
  .react-datepicker__header {
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }
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
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
};

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
  const { updateAppointment } = useAppointments();

  /* responsive */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* load appointments for this customer */
  const loadMine = useCallback(async () => {
    if (!user?.id) {
      setAppts([]);
      return;
    }
    try {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("Appointments")
        .select(
          "appointment_id,date,expectedStart_time,expectedEnd_time,comments,status,display,customer_id"
        )
        .eq("customer_id", user.id)
        .eq("display", true);

      if (error) throw error;

      const today = todayISO();
      const cleaned: ApptCard[] = (data ?? [])
        .filter(
          (r: any) => (r.status ?? "Booked").toLowerCase() !== "cancelled"
        )
        .filter((r: any) => r.date >= today)
        .map((r: any) => ({
          appointment_id: r.appointment_id,
          date: r.date,
          expectedStart_time: takeHHMM(r.expectedStart_time),
          expectedEnd_time: takeHHMM(r.expectedEnd_time),
          comments: r.comments ?? null,
          status: r.status ?? null,
        }))
        .sort((a, b) =>
          `${a.date} ${a.expectedStart_time}`.localeCompare(
            `${b.date} ${b.expectedStart_time}`
          )
        );

      setAppts(cleaned);
    } catch (e: any) {
      console.error("loadMine error", e);
      setErr(e?.message || "Failed to load your appointments.");
      setAppts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  /* called by BookAppointment when a new booking is made */
  const handleBooked = async () => {
    await loadMine();
  };

  /* ---------- Cancel flow ---------- */
  const openCancel = (a: ApptCard) => {
    setToCancel(a);
    setCancelReason("");
    setCancelOpen(true);
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

      // optimistic update
      setAppts((prev) =>
        prev.filter((a) => a.appointment_id !== toCancel.appointment_id)
      );
      closeCancel();
    } catch (e: any) {
      alert(e?.message || "Failed to cancel appointment.");
    }
  };

  /* ---------- Update flow ---------- */
  const openUpdate = async (a: ApptCard) => {
    setToUpdate(a);
    setUpdateComments(a.comments ?? "");
    setUpdateOpen(true);
    setDetailsLoading(true);
    setUpdateDetails(null);

    try {
      // Service/Package
      const { data: sp, error: spErr } = await supabase
        .from("AppointmentServicePlan")
        .select("service_id,package_id")
        .eq("appointment_id", a.appointment_id)
        .single();
      if (spErr) throw spErr;

      let serviceName = "";
      let durationText = "—";
      let priceText = "—";

      if (sp?.service_id) {
        const { data: s, error: sErr } = await supabase
          .from("Services")
          .select("name,duration,min_price,max_price")
          .eq("service_id", sp.service_id)
          .single();
        if (sErr) throw sErr;
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
      } else if (sp?.package_id) {
        const { data: p, error: pErr } = await supabase
          .from("Package")
          .select("name,expected_duration,price")
          .eq("package_id", sp.package_id)
          .single();
        if (pErr) throw pErr;
        serviceName = p.name;
        durationText = p.expected_duration
          ? `${p.expected_duration} mins`
          : "—";
        priceText =
          p.price != null && !Number.isNaN(p.price) ? `₱${p.price}` : "—";
      }

      // Stylist
      let stylistName = "—";
      const { data: link, error: linkErr } = await supabase
        .from("AppointmentStylists")
        .select("stylist_id")
        .eq("appointment_id", a.appointment_id)
        .single();
      if (!linkErr && link?.stylist_id) {
        const { data: st, error: stErr } = await supabase
          .from("Stylists")
          .select("name")
          .eq("stylist_id", link.stylist_id)
          .single();
        if (!stErr && st?.name) stylistName = st.name;
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
      await updateAppointment(toUpdate.appointment_id, {
        comments: updateComments.trim() ? updateComments.trim() : null,
      });
      setAppts((prev) =>
        prev.map((x) =>
          x.appointment_id === toUpdate.appointment_id
            ? { ...x, comments: updateComments.trim() || null }
            : x
        )
      );
      closeUpdate();
    } catch (e: any) {
      alert(e?.message || "Failed to update appointment.");
    }
  };

  return (
    <>
      <style>{calendarStyles}</style>
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
        {/* Booking Section */}
        <BookAppointment
          onBooked={handleBooked}
          customerId={user?.id ?? null}
        />

        {/* Appointments */}
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
            maxHeight: isMobile ? "60vh" : "70vh", // ensure card itself won't exceed viewport too much
          }}
        >
          <h2
            style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}
          >
            My Upcoming Appointments
          </h2>

          {/* Scrollable list area */}
          <div
            aria-label="Upcoming appointments"
            style={{
              overflowY: "auto",
              paddingRight: 6,
              // leave some room for header & padding inside the white card
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
                        {a.comments ? a.comments : "—"}
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

      {/* Cancel Confirmation Modal */}
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

      {/* Update Appointment Modal */}
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
                  cursor: "pointer",
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
