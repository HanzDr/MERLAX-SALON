import React from "react";
import type { unrespondedFeedbackRow } from "@/pages/customer/CustomerFeedback";

type RowForTable = unrespondedFeedbackRow & {
  services?: string[];
  package_name?: string;
};

type Props = {
  unrespondedFeedbackData: RowForTable[];
  onRespond?: (feedbackId: string) => void;
  onView?: (feedbackId: string) => void;
  // onSkip removed
};

const formatDate = (iso?: string | Date | null) => {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const getServiceLabel = (row: RowForTable) => {
  // Prefer package (if any), else list services, else en dash
  if (row.package_name && row.package_name.trim().length > 0)
    return row.package_name;
  if (row.services?.length) return row.services.filter(Boolean).join(", ");
  return "—";
};

const SubmitFeedback: React.FC<Props> = ({
  unrespondedFeedbackData,
  onRespond = () => {},
  onView = () => {},
}) => {
  const hasRows =
    Array.isArray(unrespondedFeedbackData) &&
    unrespondedFeedbackData.length > 0;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Feedback
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Share your experience to help us improve our services.
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Service / Package
                </th>
                <th scope="col" className="px-4 py-3 font-medium w-56">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!hasRows && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No pending feedback. 🎉
                  </td>
                </tr>
              )}

              {hasRows &&
                unrespondedFeedbackData.map((row) => {
                  const date = row.created_at;
                  const label = getServiceLabel(row);
                  const key = row.feedback_id ?? `${date}-${label}`;
                  const alreadyResponded = !!row.customer_response;

                  return (
                    <tr
                      key={key}
                      className="border-t border-gray-100 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-3 align-middle">
                        {formatDate(date)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="max-w-[42ch] truncate" title={label}>
                          {label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              !alreadyResponded && onRespond(row.feedback_id)
                            }
                            disabled={alreadyResponded}
                            className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2
                              ${
                                alreadyResponded
                                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  : "bg-black text-white hover:opacity-90 active:opacity-80 focus:ring-black/30"
                              }`}
                            aria-label={`Respond to feedback ${row.feedback_id}`}
                            aria-disabled={alreadyResponded}
                            title={
                              alreadyResponded ? "Already submitted" : "Respond"
                            }
                          >
                            {alreadyResponded ? "Responded" : "Respond"}
                          </button>

                          <button
                            type="button"
                            onClick={() => onView(row.feedback_id)}
                            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium border border-gray-300 text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300/60"
                            aria-label={`View feedback ${row.feedback_id}`}
                          >
                            View
                          </button>

                          {/* Skip button removed */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubmitFeedback;
