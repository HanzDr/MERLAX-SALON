// features/feedback/components/ui/feedback-card.tsx

import { RiDeleteBin6Line } from "react-icons/ri";
import { StarRating } from "../../utils/helper-methods";
import type {
  FeedbackCardProps as BaseCardProps,
  FeedbackCategory,
} from "../../utils/feedback-types";

const badgeClasses: Record<FeedbackCategory, string> = {
  Positive: "bg-green-100 text-green-700 border-green-200",
  Negative: "bg-rose-100 text-rose-700 border-rose-200",
  Suggestion: "bg-violet-100 text-violet-700 border-violet-200",
  Neutral: "bg-gray-100 text-gray-700 border-gray-200",
};

type FeedbackCardProps = BaseCardProps & {
  /** NEW: whether admin already posted a response */
  adminResponded?: boolean;
};

function formatDate(input: unknown) {
  const d =
    typeof input === "string"
      ? new Date(input)
      : input instanceof Date
      ? input
      : typeof input === "number"
      ? new Date(input)
      : null;
  if (!d || isNaN(d.getTime())) return String(input ?? "");
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const FeedbackCard = ({
  firstName,
  middleName,
  lastName,
  date,
  description,
  rating,
  category,
  onCategorize,
  onRespond,
  adminResponded = false, // ⬅️ default false
}: FeedbackCardProps) => {
  const displayDate = formatDate(date);
  const respondLabel = adminResponded ? "View response" : "Respond";

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {`${firstName}${middleName ? ` ${middleName}` : ""} ${lastName}`}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{displayDate}</p>
          </div>
          <StarRating rating={rating} outOf={5} />
        </div>

        <div className="mt-6">
          <p className="leading-relaxed text-gray-700">{description}</p>
        </div>

        {category && (
          <div className="mt-4">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${badgeClasses[category]}`}
            >
              {category}
            </span>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              className="rounded-xl border border-gray-400 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              onClick={onCategorize}
            >
              Categorize
            </button>
            <button
              className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${
                adminResponded
                  ? "bg-gray-700 hover:bg-gray-800"
                  : "bg-amber-400 hover:bg-amber-500"
              }`}
              onClick={onRespond}
            >
              {respondLabel}
            </button>
          </div>

          <button
            aria-label="Delete feedback"
            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
          >
            <RiDeleteBin6Line className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
