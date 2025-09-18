// src/components/feedback/FeedbackForm.tsx
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type feedbackFormData,
  feedbackFormSchema,
} from "@/validation/FeedbackSchema";

type AppointmentSummary = {
  dateISO: string; // e.g. "2025-04-22"
  serviceName: string; // e.g. "Rebond"
  start: string; // "13:00" 24h
  end: string; // "16:00" 24h
};

type Props = {
  appointment: AppointmentSummary;
  onCancel?: () => void;
  onSubmitForm?: (data: feedbackFormData) => Promise<void> | void;
};

const StarIcon: React.FC<{ filled: boolean; className?: string }> = ({
  filled,
  className,
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2.75l2.93 5.94 6.56.95-4.75 4.63 1.12 6.53L12 17.98l-5.86 3.09 1.12-6.53-4.75-4.63 6.56-.95L12 2.75z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
  </svg>
);

function formatDateLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(hhmm24: string) {
  // expects "HH:MM"
  const [h, m] = hhmm24.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const FeedbackForm: React.FC<Props> = ({
  appointment,
  onCancel,
  onSubmitForm,
}) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<feedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: { rating: 0, comment: "" },
  });

  async function onSubmit(data: feedbackFormData) {
    await onSubmitForm?.(data);
    reset({ rating: 0, comment: "" });
  }

  const dateText = formatDateLong(appointment.dateISO);
  const timeRange = `${formatTime(appointment.start)} - ${formatTime(
    appointment.end
  )}`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto bg-white"
    >
      {/* Header */}
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        Feedback Form
      </h1>
      <p className="text-sm text-gray-600 mt-2">
        Share your experience for the appointment on{" "}
        <span className="font-medium">{dateText}</span>
      </p>

      {/* Appointment Details Card */}
      <div className="mt-6">
        <p className="text-sm font-medium text-gray-900">Appointment Details</p>
        <div className="mt-3 rounded-xl border border-gray-300 p-5">
          <p className="text-sm">
            <span className="font-semibold">Date:</span> {dateText}
          </p>
          <p className="text-sm mt-2">
            <span className="font-semibold">Service:</span>{" "}
            {appointment.serviceName}
          </p>
          <p className="text-sm mt-2">
            <span className="font-semibold">Time:</span> {timeRange}
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-8">
        <label className="block text-sm font-medium text-gray-900">
          Rating
        </label>

        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <div className="mt-3 flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = field.value >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    className="group"
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    onClick={() => field.onChange(value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight")
                        field.onChange(Math.min(5, (field.value || 0) + 1));
                      if (e.key === "ArrowLeft")
                        field.onChange(Math.max(1, (field.value || 0) - 1));
                    }}
                  >
                    <StarIcon
                      filled={active}
                      className={`h-8 w-8 ${
                        active ? "text-yellow-500" : "text-gray-300"
                      } group-hover:text-yellow-500 transition-colors`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.rating && (
          <p className="mt-2 text-sm text-red-600">{errors.rating.message}</p>
        )}
      </div>

      {/* Comment */}
      <div className="mt-8">
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-900"
        >
          Comment
        </label>
        <textarea
          id="comment"
          rows={5}
          placeholder="Share you thoughts about the service"
          className={`mt-3 w-full rounded-xl border ${
            errors.comment ? "border-red-500" : "border-gray-300"
          } p-4 text-sm outline-none focus:ring-2 focus:ring-yellow-400`}
          {...register("comment")}
        />
        {errors.comment && (
          <p className="mt-2 text-sm text-red-600">{errors.comment.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-10 flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-amber-300 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Add Feedback"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm;
