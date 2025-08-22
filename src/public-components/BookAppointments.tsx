import { useState, useMemo, useCallback, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";

const useBookingLimits = () => {
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 21);
    return limit;
  }, []);

  const isSunday = useCallback((date: Date) => date.getDay() !== 0, []);

  return { today, maxDate, isSunday };
};

const BookAppointment: React.FC = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [stylist, setStylist] = useState<string>("");
  const [servicePlan, setServicePlan] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const { today, maxDate, isSunday } = useBookingLimits();
  const { services, stylists } = useServicesAndStylistContext();

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Inject modern calendar styles
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .react-datepicker {
        border: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        border-radius: 16px;
        background-color: #fff;
        padding: 16px;
      }
      .react-datepicker__header {
        background-color: #fff;
        border-bottom: 1px solid #eee;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
      }
      .react-datepicker__current-month,
      .react-datepicker-time__header,
      .react-datepicker-year-header {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #333;
      }
      .react-datepicker__day,
      .react-datepicker__day-name {
        width: 40px;
        line-height: 40px;
        margin: 2px;
        font-size: 14px;
        color: #333;
        border-radius: 8px;
        transition: background 0.2s ease-in-out;
      }
      .react-datepicker__day:hover {
        background-color: #FFB03022;
        cursor: pointer;
      }
      .react-datepicker__day--selected,
      .react-datepicker__day--keyboard-selected {
        background-color: #FFB030;
        color: #fff;
      }
      .react-datepicker__day--today {
        font-weight: bold;
        border: 1px solid #FFB030;
      }
      .react-datepicker__navigation-icon::before {
        border-color: #FFB030;
      }
      .react-datepicker__navigation--previous,
      .react-datepicker__navigation--next {
        top: 18px;
      }
      .react-datepicker__day--disabled {
        color: #ccc;
        background: none;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
      <p style={{ fontSize: "16px", marginBottom: "24px" }}>
        1. Stylist and Service preferred
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ fontWeight: 500 }}>Stylist</label>
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
            <option value="any">Any</option>
            {stylists.map((s) => (
              <option key={s.stylist_id} value={s.stylist_id}>
                {s.name} - {s.role}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ fontWeight: 500 }}>Service Plan</label>
          <select
            value={servicePlan}
            onChange={(e) => setServicePlan(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "10px",
            }}
          >
            {services.map((service) => (
              <option key={service.service_id} value={service.name}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ fontSize: "16px", marginBottom: "12px" }}>
        2. Select a date and available time slot to book your appointment
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection: isMobile ? "column" : "row",
          gap: "30px",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div style={{ flex: "1 1 300px" }}>
          <DatePicker
            selected={date}
            onChange={(date) => setDate(date)}
            minDate={today}
            maxDate={maxDate}
            filterDate={isSunday}
            inline
          />
        </div>

        <div style={{ flex: "1 1 300px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Time Available
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "10px 16px",
                background: "#FFB030",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                flex: isMobile ? "1 1 100%" : "1 1 120px",
              }}
            >
              8:00AM - 11:00AM
            </button>
            <button
              style={{
                padding: "10px 16px",
                background: "#FFB030",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                flex: isMobile ? "1 1 100%" : "1 1 120px",
              }}
            >
              1:00PM - 4:00PM
            </button>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={{ fontWeight: 500 }}>Discount</label>
            <select
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "10px",
              }}
            >
              <option value="">10% Off Hair Color</option>
              <option value="none">None</option>
              <option value="10off">10% Off Hair Color</option>
            </select>
          </div>
        </div>
      </div>

      <button
        style={{
          marginTop: "20px",
          width: "100%",
          padding: "14px",
          background: "#FFB030",
          border: "none",
          color: "#fff",
          fontWeight: 600,
          borderRadius: "10px",
        }}
      >
        Book Appointment
      </button>
    </div>
  );
};

export default BookAppointment;
