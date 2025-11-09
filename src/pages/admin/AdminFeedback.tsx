import { useMemo, useState, useEffect, useRef } from "react";
import CategorizeForm from "@/features/feedback/components/ui/categorize-feedback-form";
import FeedbackCard from "@/features/feedback/components/ui/feedback-card";
import FeedbackForm from "@/features/feedback/components/ui/respond-feedback-form";
import useFeedback from "@/features/feedback/hooks/useFeedback";
import type { FeedbackCategory } from "@/features/feedback/utils/feedback-types";
import type {
  feedbackCategorizeData,
  feedbackResponseData,
} from "@/validation/FeedbackSchema";

/* ------------------------- Types ------------------------- */
type ModalState =
  | { type: "CATEGORIZE"; feedbackId: string }
  | { type: "RESPOND"; feedbackId: string }
  | null;

type SortKey = "date-desc" | "date-asc" | "rating-desc" | "rating-asc";

/* --------------------- Confirm Delete Modal --------------------- */
type ConfirmDeleteModalProps = {
  open: boolean;
  name?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
};

function ConfirmDeleteModal({
  open,
  name,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: ConfirmDeleteModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative z-[101] w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">
          Hide this feedback?
        </h2>
        <p id="confirm-desc" className="mt-2 text-sm text-gray-600">
          This will hide the feedback for
          {name ? (
            <>
              {" "}
              <b>{name}</b>
            </>
          ) : null}
          . You can restore it later from the database.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Component --------------------- */
export default function AdminFeedback() {
  const {
    feedback,
    isLoading,
    error,
    getAllFeedback,
    getFeedbackByCategory,
    updateFeedback,
    softDeleteFeedback,
  } = useFeedback();

  const [modal, setModal] = useState<ModalState>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<FeedbackCategory | "ALL">("ALL");
  const [rating, setRating] = useState<number | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");

  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (category !== "ALL") {
      getFeedbackByCategory(category).catch(console.error);
    } else {
      getAllFeedback(0, 199).catch(console.error);
    }
  }, [category, getAllFeedback, getFeedbackByCategory]);

  useEffect(() => {
    setPage(1);
  }, [q, category, rating, sortBy]);

  const onClose = () => setModal(null);

  const handleSaveCategorize = async (values: feedbackCategorizeData) => {
    if (!modal || modal.type !== "CATEGORIZE") return;
    await updateFeedback({
      kind: "categorize",
      feedbackId: modal.feedbackId,
      category: values.category as FeedbackCategory,
    });
    setModal(null);
  };

  const handleSaveRespond = async (values: feedbackResponseData) => {
    if (!modal || modal.type !== "RESPOND") return;
    const comment = (values.comment ?? "").trim();
    await updateFeedback({
      kind: "respond",
      feedbackId: modal.feedbackId,
      comment,
    });
    setModal(null);
  };

  const filtered = useMemo(() => {
    // start with all fetched rows
    let list = feedback ?? [];

    // 1) Only show cards where the customer has responded
    list = list.filter((f) => f.customerHasResponded === true);

    // 2) Search
    const qLower = q.trim().toLowerCase();
    if (qLower) {
      list = list.filter((f) => {
        const name = [f.firstName, f.middleName, f.lastName]
          .filter(Boolean)
          .join(" ");
        return (
          name.toLowerCase().includes(qLower) ||
          (f.description ?? "").toLowerCase().includes(qLower)
        );
      });
    }

    // 3) Category filter
    if (category !== "ALL") {
      list = list.filter((f) => (f.category ?? null) === category);
    }

    // 4) Rating filter
    if (rating !== "ALL") {
      list = list.filter((f) => (Number(f.rating) || 0) === Number(rating));
    }

    // 5) Sort
    list = [...list].sort((a, b) => {
      const ra = Number(a.rating) || 0;
      const rb = Number(b.rating) || 0;
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();

      switch (sortBy) {
        case "rating-desc":
          return rb - ra || db - da;
        case "rating-asc":
          return ra - rb || db - da;
        case "date-asc":
          return da - db;
        case "date-desc":
        default:
          return db - da;
      }
    });

    return list;
  }, [feedback, q, category, rating, sortBy]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Feedback</h1>
        <p className="text-sm text-gray-500">
          Review, categorize, and respond to customer feedback.
        </p>
      </header>

      {/* Toolbar */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Search */}
        <div className="md:col-span-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or description…"
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>

        {/* Category */}
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as FeedbackCategory | "ALL")
            }
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="ALL">All</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Suggestion">Suggestion</option>
            <option value="Neutral">Neutral</option>
          </select>
        </div>

        {/* Rating (exact) */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rating
          </label>
          <select
            value={rating}
            onChange={(e) =>
              setRating(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="ALL">All</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Sort
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="rating-desc">Highest rating</option>
            <option value="rating-asc">Lowest rating</option>
          </select>
        </div>
      </div>

      {/* Meta / Loading / Error */}
      {isLoading && (
        <div className="rounded-2xl border p-6 text-center text-gray-500 mb-4">
          Loading…
        </div>
      )}
      {error && (
        <div className="rounded-2xl border p-6 text-center text-rose-600 mb-4">
          {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <span>
              Showing <b>{pageItems.length}</b> of <b>{total}</b> feedback
              {q || category !== "ALL" || rating !== "ALL" ? " (filtered)" : ""}
            </span>
            {totalPages > 1 && (
              <div className="inline-flex items-center gap-2">
                <button
                  className="rounded-lg border px-3 py-1 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span>
                  Page <b>{page}</b> / {totalPages}
                </span>
                <button
                  className="rounded-lg border px-3 py-1 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {pageItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <div className="text-lg font-semibold">No feedback found</div>
              <p className="mt-1 text-sm text-gray-500">
                Try clearing filters or changing the search.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((f) => {
                const name = [f.firstName, f.middleName, f.lastName]
                  .filter(Boolean)
                  .join(" ");
                const adminResponded = f.adminHasResponded === true;

                return (
                  <FeedbackCard
                    key={f.feedbackId}
                    feedbackId={f.feedbackId}
                    firstName={f.firstName}
                    middleName={f.middleName}
                    lastName={f.lastName}
                    date={f.date}
                    description={f.description}
                    category={f.category}
                    rating={f.rating}
                    adminResponded={adminResponded}
                    onCategorize={() =>
                      setModal({ type: "CATEGORIZE", feedbackId: f.feedbackId })
                    }
                    onRespond={() =>
                      setModal({ type: "RESPOND", feedbackId: f.feedbackId })
                    }
                    onDelete={() => setDeleteTarget({ id: f.feedbackId, name })}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {modal?.type === "CATEGORIZE" &&
        (() => {
          const item = feedback?.find((f) => f.feedbackId === modal.feedbackId);
          const normalizeCategory = (c?: string | null): FeedbackCategory => {
            switch ((c ?? "").toUpperCase()) {
              case "POSITIVE":
                return "Positive";
              case "NEGATIVE":
                return "Negative";
              case "SUGGESTION":
                return "Suggestion";
              case "NEUTRAL":
                return "Neutral";
              default:
                return "Neutral";
            }
          };
          return (
            <CategorizeForm
              key={modal.feedbackId}
              feedbackId={modal.feedbackId}
              initialCategory={normalizeCategory(item?.category)}
              onClose={onClose}
              onSave={handleSaveCategorize}
            />
          );
        })()}

      {modal?.type === "RESPOND" && (
        <FeedbackForm
          key={modal.feedbackId}
          feedbackId={modal.feedbackId}
          onClose={onClose}
          onSave={handleSaveRespond}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        name={deleteTarget?.name}
        isSubmitting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setIsDeleting(true);
            await softDeleteFeedback(deleteTarget.id);
            setDeleteTarget(null);
          } catch (e) {
            console.error(e);
            setIsDeleting(false);
          }
        }}
      />
    </div>
  );
}
