import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Star } from "lucide-react";

/* ---------------- helpers ---------------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const fmtTime12 = (hhmm: string) => {
  const [hS, mS] = hhmm.split(":");
  let h = Number(hS);
  const m = Number(mS || 0);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad2(m)}${ap}`;
};

/* ---------------- props ---------------- */
type SubmitFeedbackFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    rating: number;
    comment: string;
  }) => Promise<void> | void;
  appointment: {
    dateISO: string; // e.g. "2025-04-22"
    serviceName: string; // e.g. "Rebond"
    startHHMM: string; // "13:00"
    endHHMM: string; // "16:00"
  };
  submitting?: boolean;
  initialRating?: number;
  initialComment?: string;
};

const SubmitFeedbackForm: React.FC<SubmitFeedbackFormProps> = ({
  open,
  onClose,
  onSubmit,
  appointment,
  submitting = false,
  initialRating = 0,
  initialComment = "",
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>(initialComment);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setRating(initialRating);
    setHover(0);
    setComment(initialComment);
    setError(null);
    const t = setTimeout(() => textRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, initialRating, initialComment]);

  const prettyDate = useMemo(
    () => fmtDateLong(appointment.dateISO),
    [appointment.dateISO]
  );
  const prettyTime = useMemo(
    () =>
      `${fmtTime12(appointment.startHHMM)} - ${fmtTime12(appointment.endHHMM)}`,
    [appointment.startHHMM, appointment.endHHMM]
  );

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    setError(null);
    await onSubmit({ rating, comment: comment.trim() });
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 id="feedback-title" className="text-2xl font-bold">
              Feedback Form
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Share you experience for the appointment on {prettyDate}
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-8 px-6 pb-6 pt-4">
          {/* Appointment Details */}
          <div>
            <div className="mb-2 text-sm font-semibold text-gray-500">
              Appointment Details
            </div>
            <div className="rounded-xl border border-gray-300 p-4">
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold">Date: </span>
                  {prettyDate}
                </div>
                <div>
                  <span className="font-semibold">Service: </span>
                  {appointment.serviceName}
                </div>
                <div>
                  <span className="font-semibold">Time: </span>
                  {prettyTime}
                </div>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <div className="mb-3 text-sm font-semibold text-gray-500">
              Rating
            </div>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        filled
                          ? "fill-amber-400 stroke-amber-400"
                          : "stroke-gray-900"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          </div>

          {/* Comment */}
          <div>
            <div className="mb-2 text-sm font-semibold text-gray-500">
              Comment
            </div>
            <textarea
              ref={textRef}
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share you thoughts about the service"
              className="w-full resize-y rounded-xl border border-gray-900/90 p-3 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-amber-400 px-5 py-2.5 font-semibold text-black hover:bg-amber-500 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Add Feedback"}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-red-500 px-5 py-2.5 font-semibold text-white hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitFeedbackForm;
