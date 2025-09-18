// src/pages/admin/AdminFeedback.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Search, Trash2, Star } from "lucide-react";

type Category = "Positive" | "Negative" | "Neutral" | "Suggestion";
type TabKey = "all" | "unresponded" | "responded";

type FeedbackItem = {
  id: string;
  customer: string;
  dateISO: string; // "2025-04-02"
  text: string;
  rating: number; // 1..5
  category: Category;
  responded: boolean;
};

const seedData: FeedbackItem[] = [
  {
    id: "1",
    customer: "Mika Regalado",
    dateISO: "2025-04-02",
    text: "Service was amazing, but there was a delay",
    rating: 4,
    category: "Positive",
    responded: false,
  },
  {
    id: "2",
    customer: "Mica  Dims",
    dateISO: "2025-04-03",
    text: "Exceptional service! The attention to detail was outstanding",
    rating: 4,
    category: "Neutral",
    responded: false,
  },
  {
    id: "3",
    customer: "Luis Palparan",
    dateISO: "2025-04-03",
    text: "The waiting time was too long today, and the result wasn't what I expected.",
    rating: 2,
    category: "Negative",
    responded: false,
  },
  {
    id: "4",
    customer: "Benjamin Asjali",
    dateISO: "2025-02-14",
    text: "The staff was kind, but maybe improving the waiting time and confirming the desired result beforehand could make the experience even better!",
    rating: 3,
    category: "Suggestion",
    responded: true,
  },
];

const categoryColors: Record<Category, string> = {
  Positive: "bg-emerald-100 text-emerald-700",
  Negative: "bg-rose-100 text-rose-700",
  Neutral: "bg-gray-200 text-gray-700",
  Suggestion: "bg-violet-100 text-violet-700",
};

function formatMDY(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function Stars({ value }: { value: number }) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < full;
        return (
          <Star
            key={i}
            className={`h-4 w-4 ${active ? "text-amber-400" : "text-gray-300"}`}
            fill={active ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`}
    >
      {children}
    </span>
  );
}

const TabButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-amber-300 text-gray-900"
        : "text-gray-600 hover:text-gray-900"
    }`}
  >
    {children}
  </button>
);

const AdminFeedback: React.FC = () => {
  const [items, setItems] = useState<FeedbackItem[]>(seedData);
  const [tab, setTab] = useState<TabKey>("all");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return items
      .filter((f) => {
        if (tab === "responded") return f.responded;
        if (tab === "unresponded") return !f.responded;
        return true;
      })
      .filter((f) => (category === "All" ? true : f.category === category))
      .filter((f) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          f.customer.toLowerCase().includes(q) ||
          f.text.toLowerCase().includes(q)
        );
      });
  }, [items, tab, category, query]);

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function toggleResponded(id: string) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, responded: !x.responded } : x))
    );
  }

  function recategorize(id: string) {
    // simple demo action — cycle through categories
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              category:
                x.category === "Positive"
                  ? "Neutral"
                  : x.category === "Neutral"
                  ? "Suggestion"
                  : x.category === "Suggestion"
                  ? "Negative"
                  : "Positive",
            }
          : x
      )
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Title */}
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Feedback Management
      </h1>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2">
          <span className="inline-block h-4 w-4 rounded-sm border border-gray-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="bg-transparent text-sm text-gray-800 focus:outline-none"
          >
            <option>All</option>
            <option>Positive</option>
            <option>Neutral</option>
            <option>Negative</option>
            <option>Suggestion</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-64 rounded-full border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-4">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All Feedback
        </TabButton>
        <TabButton
          active={tab === "unresponded"}
          onClick={() => setTab("unresponded")}
        >
          Unresponded
        </TabButton>
        <TabButton
          active={tab === "responded"}
          onClick={() => setTab("responded")}
        >
          Responded
        </TabButton>
      </div>

      {/* Cards grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {filtered.map((f) => (
          <div
            key={f.id}
            className="rounded-xl border border-gray-300 p-5 shadow-sm"
          >
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {f.customer}
                </h3>
                <p className="text-xs text-gray-500">{formatMDY(f.dateISO)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Stars value={f.rating} />
                {/* outline star on far right (bookmark-ish) */}
                <Star className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Body */}
            <p className="mt-3 text-sm leading-6 text-gray-800">{f.text}</p>

            {/* Tag */}
            <div className="mt-3">
              <Tag color={categoryColors[f.category]}>{f.category}</Tag>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => recategorize(f.id)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Categorize
                </button>
                <button
                  onClick={() => toggleResponded(f.id)}
                  className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-amber-300"
                >
                  {f.responded ? "Unrespond" : "Respond"}
                </button>
              </div>
              <button
                onClick={() => remove(f.id)}
                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                aria-label="Delete feedback"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
            No feedback found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFeedback;
