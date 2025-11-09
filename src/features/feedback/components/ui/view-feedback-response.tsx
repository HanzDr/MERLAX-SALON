import React from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

/* ========= Tiny utils for consistent date/time formatting ========= */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse common inputs into a Date (local) or null */
function tryParseDate(input?: string | null): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // Prioritize common machine formats first
  // YYYY-MM-DD (optionally with time)
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (ymd) {
    const yy = Number(ymd[1]),
      mm = Number(ymd[2]),
      dd = Number(ymd[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback to Date constructor
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Display date as: Oct 15 2025 */
function formatDisplayDate(input?: string | null): string {
  const d = tryParseDate(input);
  if (!d) return input || "—";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

/** Convert "HH:MM" (24h) to "h:mma" compact (no space before AM/PM) */
function to12hCompact(hhmm?: string | null): string | null {
  if (!hhmm) return null;
  const [hS, mS] = hhmm.split(":");
  if (hS == null || mS == null) return hhmm;
  let h = Number(hS);
  const m = Number(mS);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)}${ap}`;
}

/* ==================== Stars ==================== */

export const StarRating = ({
  rating = 0,
  outOf = 5,
}: {
  rating?: number;
  outOf?: number;
}) => (
  <div
    className="flex items-center gap-1 text-amber-400"
    aria-label={`Rating: ${rating} of ${outOf}`}
  >
    {Array.from({ length: outOf }).map((_, i) =>
      i < (rating ?? 0) ? (
        <FaStar key={i} className="h-5 w-5" />
      ) : (
        <FaRegStar key={i} className="h-5 w-5" />
      )
    )}
  </div>
);

/* ==================== Types & Component ==================== */

export type ViewResponseData = {
  feedback_id: string;
  created_at: string;
  rating?: number | null;
  customer_response?: string | null;
  admin_response?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  services?: string[];
  package_name?: string;
  appointment?: {
    dateISO?: string; // "YYYY-MM-DD"
    startHHMM?: string; // "HH:MM"
    endHHMM?: string; // "HH:MM"
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: ViewResponseData | null;
};

/** DUMB/PRESENTATIONAL: no fetching, no state; just renders what it's given */
const ViewResponseModal: React.FC<Props> = ({ open, onClose, data }) => {
  if (!open) return null;

  const fullName = [data?.firstName, data?.middleName, data?.lastName]
    .filter((x) => (x ?? "").trim())
    .join(" ");

  // Normalize created_at (e.g., "Oct 15 2025 • 1:23PM")
  const createdDate = formatDisplayDate(data?.created_at);
  const createdTime = (() => {
    const d = tryParseDate(data?.created_at);
    if (!d) return null;
    const hh = d.getHours();
    const mm = d.getMinutes();
    const ap = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12}:${pad(mm)}${ap}`;
  })();
  const createdDisplay = data?.created_at
    ? `${createdDate}${createdTime ? ` • ${createdTime}` : ""}`
    : "—";

  // Service/Package label
  const serviceLabel =
    (data?.package_name && data.package_name.trim()) ||
    (data?.services?.length ? data.services.join(", ") : "—");

  // Appointment line: "Oct 15 2025 • 1:00PM–2:00PM"
  const apptDate = formatDisplayDate(data?.appointment?.dateISO);
  const start = to12hCompact(data?.appointment?.startHHMM);
  const end = to12hCompact(data?.appointment?.endHHMM);
  const appt = data?.appointment?.dateISO
    ? `${apptDate}${start ? ` • ${start}` : ""}${end ? `–${end}` : ""}`
    : "—";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-response-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full sm:max-w-2xl rounded-2xl bg-white shadow-xl sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="view-response-title"
              className="truncate text-lg font-semibold"
            >
              Feedback Response
            </h2>
            <p className="text-xs text-gray-500">
              ID: {data?.feedback_id ?? "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer">{fullName || "—"}</Field>
            <Field label="Submitted">{createdDisplay}</Field>
            <Field label="Appointment">{appt}</Field>
            <Field label="Service / Package">{serviceLabel}</Field>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-900">
                Customer Response
              </div>
              <div className="min-h-[72px] whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                {data?.customer_response?.trim() || "—"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-900">
                Admin Response
              </div>
              <div className="min-h-[72px] whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                {data?.admin_response?.trim() || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Rating
            </div>
            <div className="flex items-center gap-2">
              {typeof data?.rating === "number" ? (
                <>
                  <StarRating
                    rating={Math.max(0, Math.min(5, Math.round(data.rating)))}
                    outOf={5}
                  />
                  <span className="text-xs text-gray-500">
                    ({Math.max(0, Math.min(5, Math.round(data.rating)))}/5)
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* Tiny label/value subcomponent (kept here to stay "dumb") */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-1">
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {label}
    </div>
    <div className="text-sm text-gray-900">{children}</div>
  </div>
);

export default ViewResponseModal;
