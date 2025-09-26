// features/feedback/components/CategorizeFeedback.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StarRating } from "../utils/helper-methods";
import type { FeedbackCategory } from "../utils/feedback-types";
import {
  feedbackCategorizeSchema,
  type feedbackCategorizeData,
} from "@/validation/FeedbackSchema";

export type CategorizeFeedbackProps = {
  feedbackId: string;
  onClose: () => void;
  onSave: (data: feedbackCategorizeData) => Promise<void> | void; // page handles mutation + close
  initialCategory?: FeedbackCategory;
};

export default function CategorizeForm({
  feedbackId,
  onClose,
  onSave,
  initialCategory = "Positive",
}: CategorizeFeedbackProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<feedbackCategorizeData>({
    resolver: zodResolver(feedbackCategorizeSchema),
    defaultValues: { category: initialCategory },
  });

  const submit = async (values: feedbackCategorizeData) => {
    await onSave(values); // forward to page
  };

  const handleCancel = () => {
    reset({ category: initialCategory });
    onClose();
  };

  return (
    <div className="min-h-screen w-full bg-amber-400/90 p-8 md:p-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-black">Categorize Feedback</h2>

        {/* Preview (example content; bind real values if needed) */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow">
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold text-black">Mika Regalado</p>
            <div className="flex items-center gap-1 text-amber-400">
              <StarRating rating={5} outOf={5} />
            </div>
          </div>
          <p className="mt-3 text-gray-700">
            Service was amazing, but there was a delay.
          </p>
        </div>

        <label className="mt-10 block text-2xl font-semibold text-black">
          Category
        </label>

        <form
          onSubmit={handleSubmit(submit)}
          className="mt-3 rounded-xl bg-white p-3 shadow"
        >
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-transparent bg-white px-4 py-3 text-base text-gray-900 outline-none"
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

            {/* Chevron */}
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

          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-black/60 bg-amber-400 px-8 py-3 text-base font-semibold text-black shadow-sm hover:bg-amber-300 active:scale-[0.99]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-white px-8 py-3 text-base font-semibold text-black shadow-sm hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
