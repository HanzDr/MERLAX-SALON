import React from "react";
import useAnalytics, {
  type RangePreset,
} from "@/features/analytics/hooks/useAnalytics";
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const palette = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a855f7",
  "#0ea5e9",
  "#22c55e",
];

const presets: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

/* ---------------------- Date Formatter ---------------------- */
const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const AdminAnalytics: React.FC = () => {
  const {
    loading,
    error,
    refresh,
    range,
    setRange,
    resolvedRange,
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    avgRating,
    totalDeltaPct,
    completedDeltaPct,
    cancelledDeltaPct,
    avgRatingDeltaPct,
    apptTrend,
    topStylists,
    servicesShare,
    feedbackByCategory,
  } = useAnalytics();

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as RangePreset;
    if (preset === "custom") {
      setRange({ preset, start: resolvedRange.start, end: resolvedRange.end });
    } else {
      setRange({ preset });
    }
  };

  const handleDateChange =
    (key: "start" | "end") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setRange((r) => ({
        preset: "custom",
        start: key === "start" ? val : r.start,
        end: key === "end" ? val : r.end,
      }));
    };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 animate-pulse">
        Loading analytics…
      </div>
    );
  if (error)
    return <div className="p-10 text-center text-rose-600">{error}</div>;

  return (
    <div className="relative">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Overview of salon activity and performance
            </p>

            {/* Normalized Date Range */}
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 text-gray-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a2 2 0 012 2v2H3V6a2 2 0 012-2h1V3a1 1 0 011-1zm-3 8v6a2 2 0 002 2h10a2 2 0 002-2v-6H3zm5 2a1 1 0 000 2h4a1 1 0 100-2H8z"
                    clipRule="evenodd"
                  />
                </svg>
                Range:{" "}
                <b className="text-gray-800">
                  {formatDate(resolvedRange.start)}
                </b>
                <span>→</span>
                <b className="text-gray-800">{formatDate(resolvedRange.end)}</b>
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">
                Preset
              </label>
              <select
                value={range.preset}
                onChange={handlePresetChange}
                className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-amber-300"
              >
                {presets.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {range.preset === "custom" && (
              <>
                <LabeledInput
                  label="Start"
                  type="date"
                  value={range.start ?? ""}
                  onChange={handleDateChange("start")}
                />
                <LabeledInput
                  label="End"
                  type="date"
                  value={range.end ?? ""}
                  onChange={handleDateChange("end")}
                />
              </>
            )}

            <button
              onClick={() => refresh()}
              className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Appointments"
            value={totalAppointments}
            delta={totalDeltaPct}
          />
          <StatCard
            label="Completed"
            value={completedAppointments}
            delta={completedDeltaPct}
          />
          <StatCard
            label="Cancelled"
            value={cancelledAppointments}
            delta={cancelledDeltaPct}
            invert
          />
          <StatCard
            label="Average Rating"
            value={avgRating == null ? "—" : avgRating.toFixed(2)}
            delta={avgRatingDeltaPct}
          />
        </section>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Appointments Over Time" subtitle="Daily counts">
            <ResponsiveContainer width="100%" height={260}>
              <ReLineChart data={apptTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Appointments"
                  stroke="#2563eb"
                  strokeWidth={2.25}
                  dot={false}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Top Stylists (Completed)"
            subtitle="Best performers"
          >
            <ResponsiveContainer width="100%" height={260}>
              <ReBarChart data={topStylists.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="#16a34a"
                  name="Completed"
                  radius={[8, 8, 0, 0]}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Services & Packages Breakdown" subtitle="Top 10">
            <ResponsiveContainer width="100%" height={260}>
              <RePieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={servicesShare.slice(0, 10)}
                  dataKey="count"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {servicesShare.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
              </RePieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Feedback by Category" subtitle="Volume per topic">
            <ResponsiveContainer width="100%" height={260}>
              <ReBarChart data={feedbackByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Feedback"
                  fill="#f97316"
                  radius={[8, 8, 0, 0]}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

/* ---------------------- Reusable UI Bits ---------------------- */

const LabeledInput = ({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div>
    <label className="block text-[11px] text-gray-600 mb-1">{label}</label>
    <input
      {...rest}
      className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-amber-300"
    />
  </div>
);

const StatCard = ({
  label,
  value,
  delta,
  invert = false,
}: {
  label: string;
  value: string | number;
  delta: number | null;
  invert?: boolean;
}) => {
  const isPositive = delta != null && delta > 0;
  const isNegative = delta != null && delta < 0;
  const deltaText =
    delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}% vs last period`;

  const chipClass =
    delta == null
      ? "bg-gray-100 text-gray-600"
      : invert
      ? isNegative
        ? "bg-green-100 text-green-700"
        : isPositive
        ? "bg-rose-100 text-rose-700"
        : "bg-gray-100 text-gray-600"
      : isPositive
      ? "bg-green-100 text-green-700"
      : isNegative
      ? "bg-rose-100 text-rose-700"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[12px] text-gray-500">{label}</p>
      <div className="mt-1 flex items-baseline justify-between">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] ${chipClass}`}>
          {deltaText}
        </span>
      </div>
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="mb-3">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
    <div className="h-[260px]">{children}</div>
  </div>
);

export default AdminAnalytics;
