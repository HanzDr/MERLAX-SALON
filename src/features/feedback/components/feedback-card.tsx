// features/feedback/components/FeedbackCard.tsx
"use client";

import { RiDeleteBin6Line } from "react-icons/ri";
import { StarRating } from "../utils/helper-methods";
import type { FeedbackCardProps } from "../utils/feedback-types";

const FeedbackCard = ({
  firstName,
  middleName,
  lastName,
  date,
  description,
  rating,
  onCategorize,
  onRespond,
}: FeedbackCardProps) => {
  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
        {/* Header: name/date + rating (right) */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {`${firstName}${middleName ? ` ${middleName}` : ""} ${lastName}`}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{date}</p>
          </div>

          <StarRating rating={rating} outOf={5} />
        </div>

        {/* Body: description */}
        <div className="mt-6">
          <p className="leading-relaxed text-gray-700">{description}</p>
        </div>

        {/* Footer: actions */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              className="rounded-xl border border-gray-400 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              onClick={onCategorize}
            >
              Categorize
            </button>
            <button
              className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-500"
              onClick={onRespond}
            >
              Respond
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
