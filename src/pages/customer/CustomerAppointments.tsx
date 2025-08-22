import { useEffect, useState } from "react";
import BookAppointment from "@/public-components/BookAppointments";
import "react-datepicker/dist/react-datepicker.css";

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

const CustomerAppointments: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        <BookAppointment />

        {/* Appointments */}
        <div
          style={{
            flex: 0.9,
            minWidth: "300px",
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            My Upcoming Appointments
          </h2>

          {[1, 2].map((id: number) => (
            <div
              key={id}
              style={{
                border: "1px solid #eee",
                padding: "16px",
                borderRadius: "6px",
                marginBottom: "16px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <strong>📅 Monday, April 21</strong>
              </div>
              <div style={{ marginBottom: "8px" }}>🕒 1:00PM - 4:00PM</div>
              <div style={{ marginBottom: "8px" }}>Notes: Allergic to</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#007bff",
                    cursor: "pointer",
                  }}
                >
                  Update
                </button>
                <button
                  style={{
                    background: "red",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                  }}
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CustomerAppointments;
