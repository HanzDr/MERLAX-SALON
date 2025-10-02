// features/feedback/components/FeedbackForm.tsx

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseclient";
import { useFeedbackContext } from "@/features/feedback/context/FeedbackContext";

type FeedbackResponseData = { comment: string };

export type FeedbackFormProps = {
  feedbackId: string;
  onClose: () => void;

  /** Optional prefilled messages; if omitted, we fetch from DB */
  customerMessage?: string | null;
  adminMessage?: string | null;

  /** Called after a successful send, e.g. to close or refetch */
  onSave?: (data: FeedbackResponseData) => Promise<void> | void;
};

export default function FeedbackForm({
  feedbackId,
  onClose,
  customerMessage,
  adminMessage,
  onSave,
}: FeedbackFormProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { updateFeedback } = useFeedbackContext();

  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [customerText, setCustomerText] = useState<string>(
    customerMessage ?? ""
  );
  const [adminText, setAdminText] = useState<string>(adminMessage ?? "");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FeedbackResponseData>({ defaultValues: { comment: "" } });

  // Fetch from DB if messages weren’t provided
  useEffect(() => {
    let cancelled = false;
    const needFetch =
      customerMessage === undefined || adminMessage === undefined;

    (async () => {
      if (!needFetch) return;
      try {
        setLoading(true);
        setLoadErr(null);
        const { data, error } = await supabase
          .from("Feedback")
          .select("customer_response, admin_response")
          .eq("feedback_id", feedbackId)
          .single();
        if (error) throw error;
        if (!cancelled) {
          setCustomerText(data?.customer_response ?? "");
          setAdminText(data?.admin_response ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setLoadErr(e?.message || "Failed to load messages.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feedbackId, customerMessage, adminMessage]);

  // Keep in sync if props change
  useEffect(() => {
    if (customerMessage !== undefined) setCustomerText(customerMessage ?? "");
  }, [customerMessage]);

  useEffect(() => {
    if (adminMessage !== undefined) setAdminText(adminMessage ?? "");
  }, [adminMessage]);

  // ESC to close
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  // click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const submit = async (values: FeedbackResponseData) => {
    const trimmed = (values.comment ?? "").trim();
    await updateFeedback({
      kind: "respond",
      feedbackId,
      comment: trimmed,
      respondAs: "admin",
    });

    // Update local UI to read-only with the new admin reply
    setAdminText(trimmed);
    reset({ comment: "" });

    // 🔊 Call the parent callback with the comment
    if (onSave) await onSave({ comment: trimmed });
  };

  const Box = ({
    label,
    text,
  }: {
    label: string;
    text: string | null | undefined;
  }) => (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="whitespace-pre-wrap text-sm text-gray-800">
        {text && text.trim() ? text : "—"}
      </div>
    </div>
  );

  const hasAdminResponse = !!(adminText && adminText.trim());

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="respond-title"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="respond-title" className="text-xl font-bold">
            Feedback Conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-5 text-sm text-gray-600">Loading…</div>
        ) : loadErr ? (
          <div className="px-6 py-5 text-sm text-rose-600">{loadErr}</div>
        ) : (
          <>
            <div className="space-y-4 px-6 py-5">
              <Box label="Customer message" text={customerText} />
              <Box
                label="Admin reply"
                text={hasAdminResponse ? adminText : null}
              />
            </div>

            {!hasAdminResponse && (
              <form onSubmit={handleSubmit(submit)} className="px-6 pb-5">
                <label
                  htmlFor="comment"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Your reply
                </label>
                <textarea
                  id="comment"
                  className="w-full min-h-[120px] resize-y rounded-lg border border-gray-200 bg-white p-4 text-gray-900 outline-none focus:border-gray-300"
                  placeholder="Write a thoughtful reply…"
                  {...register("comment", {
                    required: "Please write a message",
                    minLength: { value: 3, message: "Message is too short" },
                  })}
                />
                {errors.comment && (
                  <p className="mt-2 text-sm text-rose-600">
                    {errors.comment.message}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-black/20 bg-white px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-500 disabled:opacity-60"
                  >
                    {isSubmitting ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}

            {hasAdminResponse && (
              <div className="flex items-center justify-end gap-3 px-6 pb-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-black/20 bg-white px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
