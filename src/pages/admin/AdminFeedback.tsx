import { useMemo, useState, useEffect } from "react";
import CategorizeForm from "@/features/feedback/components/categorize-feedback-form";
import FeedbackCard from "@/features/feedback/components/feedback-card";
import FeedbackForm from "@/features/feedback/components/respond-feedback-form";
import { useFeedbackContext } from "@/features/feedback/context/FeedbackContext";
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

/* --------------------- Component --------------------- */
export default function AdminFeedback() {
  const { feedback, updateFeedback /* optionally: loading, error */ } =
    useFeedbackContext();

  const [modal, setModal] = useState<ModalState>(null);

  // Toolbar state
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<FeedbackCategory | "ALL">("ALL");
  const [minRating, setMinRating] = useState<number | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");

  // Simple client-side pagination
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Reset to page 1 on any filter/search change
    setPage(1);
  }, [q, category, minRating, sortBy]);

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
    let list = feedback ?? [];

    // Search over name + description
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

    // Category filter
    if (category !== "ALL") {
      list = list.filter((f) => (f.category ?? null) === category);
    }

    // Min rating
    if (minRating !== "ALL") {
      list = list.filter((f) => (Number(f.rating) || 0) >= Number(minRating));
    }

    // Sorting
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
  }, [feedback, q, category, minRating, sortBy]);

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
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="ALL">All</option>
            <option value="COMPLIMENT">Compliment</option>
            <option value="COMPLAINT">Complaint</option>
            <option value="SUGGESTION">Suggestion</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Min Rating */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Min Rating
          </label>
          <select
            value={minRating}
            onChange={(e) =>
              setMinRating(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="ALL">All</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}+
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

      {/* Meta line */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <span>
          Showing <b>{pageItems.length}</b> of <b>{total}</b> feedback
          {q || category !== "ALL" || minRating !== "ALL" ? " (filtered)" : ""}
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
          {pageItems.map((f) => (
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
              onCategorize={() =>
                setModal({ type: "CATEGORIZE", feedbackId: f.feedbackId })
              }
              onRespond={() =>
                setModal({ type: "RESPOND", feedbackId: f.feedbackId })
              }
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal?.type === "CATEGORIZE" && (
        <CategorizeForm
          key={modal.feedbackId}
          feedbackId={modal.feedbackId}
          onClose={onClose}
          onSave={handleSaveCategorize}
        />
      )}

      {modal?.type === "RESPOND" && (
        <FeedbackForm
          key={modal.feedbackId}
          feedbackId={modal.feedbackId}
          onClose={onClose}
          onSave={handleSaveRespond}
        />
      )}
    </div>
  );
}
