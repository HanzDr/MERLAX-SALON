// features/feedback/components/FeedbackForm.tsx
"use client";

import { useForm } from "react-hook-form";
import type { FeedbackFormProps } from "../utils/feedback-types";
import type { feedbackResponseData } from "@/validation/FeedbackSchema";

const FeedbackForm = ({ feedbackId, onClose, onSave }: FeedbackFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<feedbackResponseData>({
    defaultValues: { comment: "" },
  });

  const submit = async (values: feedbackResponseData) => {
    await onSave(values); // page will do mutation + close
  };

  const handleCancel = () => {
    reset({ comment: "" });
    onClose();
  };

  return (
    <div className="min-h-screen w-full bg-amber-400/90 p-8 md:p-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-black">Respond to Feedback</h2>

        <form
          onSubmit={handleSubmit(submit)}
          className="mt-6 rounded-xl bg-white p-5 shadow"
        >
          <label
            htmlFor="comment"
            className="block text-lg font-semibold text-black"
          >
            Message
          </label>

          <textarea
            id="comment"
            className="mt-3 w-full min-h-[140px] resize-y rounded-lg border border-gray-200 bg-white p-4 text-gray-900 outline-none focus:border-gray-300"
            placeholder="Write a thoughtful reply…"
            {...register("comment", {
              required: "Please write a message",
              minLength: { value: 3, message: "Message is too short" },
            })}
          />

          {errors.comment && (
            <p className="mt-2 text-sm text-red-600">
              {errors.comment.message}
            </p>
          )}

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
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
