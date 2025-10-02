// features/feedback/components/CategorizeFeedback.tsx

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FeedbackCategory } from "../../utils/feedback-types";
import {
  feedbackCategorizeSchema,
  type feedbackCategorizeData,
} from "@/validation/FeedbackSchema";
import { useFeedbackContext } from "@/features/feedback/context/FeedbackContext";

export type CategorizeFeedbackProps = {
  feedbackId: string;
  onClose: () => void;
  onSave?: (data: feedbackCategorizeData) => Promise<void> | void;
  initialCategory?: FeedbackCategory; // e.g. "Positive" | "Negative" | "Suggestion" | "Neutral"
};

export default function CategorizeForm({
  feedbackId,
  onClose,
  onSave,
  initialCategory = "Positive",
}: CategorizeFeedbackProps) {
  const { updateFeedback } = useFeedbackContext();
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<feedbackCategorizeData>({
    resolver: zodResolver(feedbackCategorizeSchema),
    defaultValues: { category: initialCategory },
  });

  // IMPORTANT: keep the select in sync when opening the modal for another item
  useEffect(() => {
    reset({ category: initialCategory });
  }, [initialCategory, feedbackId, reset]);

  const category = watch("category");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) handleCancel();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isSubmitting]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSubmitting) return;
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      handleCancel();
    }
  };

  const submit = async (values: feedbackCategorizeData) => {
    setSubmitErr(null);
    try {
      await updateFeedback({
        kind: "categorize",
        feedbackId,
        category: values.category as FeedbackCategory,
      });
      if (onSave) await onSave(values);
      onClose();
    } catch (e: any) {
      setSubmitErr(e?.message || "Failed to update category.");
    }
  };

  const handleCancel = () => {
    reset({ category: initialCategory });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="categorize-title"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="categorize-title" className="text-xl font-bold">
            Categorize Feedback
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md px-2 py-1 text-sm hover:bg-gray-100"
            aria-label="Close"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-6 py-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Category
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border bg-white px-4 py-3 text-gray-900 outline-none disabled:opacity-60"
              disabled={isSubmitting}
              {...register("category", { required: "Please pick a category" })}
            >
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Suggestion">Suggestion</option>
              <option value="Neutral">Neutral</option>
            </select>

            {errors.category && (
              <p className="mt-1 text-sm text-red-500">
                {errors.category.message}
              </p>
            )}

            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-black/80 p-1">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-black"
                aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </div>
          </div>

          {submitErr && (
            <p className="mt-3 text-sm text-rose-600">{submitErr}</p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-black/20 bg-white px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-500 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Selected: <b>{category}</b>
          </p>
        </form>
      </div>
    </div>
  );
}
