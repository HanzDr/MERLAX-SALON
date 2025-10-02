import React from "react";

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
    dateISO?: string;
    startHHMM?: string;
    endHHMM?: string;
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
    .filter(Boolean)
    .join(" ");
  const created = data?.created_at
    ? new Date(data.created_at).toLocaleString()
    : "—";
  const serviceLabel =
    (data?.package_name && data.package_name.trim()) ||
    (data?.services?.length ? data.services.join(", ") : "—");
  const appt =
    (data?.appointment?.dateISO &&
      `${data.appointment.dateISO}${
        data.appointment.startHHMM ? ` • ${data.appointment.startHHMM}` : ""
      }${data.appointment.endHHMM ? `–${data.appointment.endHHMM}` : ""}`) ||
    "—";

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
            <Field label="Submitted">{created}</Field>
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
            <div className="text-sm text-gray-900">
              {typeof data?.rating === "number" ? `${data.rating}/5` : "—"}
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
