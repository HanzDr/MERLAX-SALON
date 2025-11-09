// src/pages/admin/AdminPackages.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type packageFormData,
  packageFormSchema,
} from "@/validation/PromoManagementSchema";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";
import { usePromoManagementContext } from "@/features/promo-management/context/promoManagementContext";
import AdminDiscount from "./AdminDiscount";

/* -------------------------- Types & helpers -------------------------- */

const status = ["Active", "Inactive"] as const;

type Row = {
  id: string;
  name: string;
  type: "Package" | "Bundle";
  included_services: string[];
  price: number;
  discounted?: number;
  validity?: string;
  status: (typeof status)[number];
  expected_duration?: number | null; // minutes
};

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n);

const StatusPill = ({ value }: { value: Row["status"] }) => (
  <span
    className={[
      "rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
      value === "Active"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-rose-50 text-rose-700 ring-rose-200",
    ].join(" ")}
  >
    {value}
  </span>
);

// "YYYY-MM-DD" (or ISO) → "Aug 8 2026"
function humanDate(d: string | Date | undefined) {
  if (!d) return "";
  const date = new Date(typeof d === "string" ? d : d.toISOString());
  const m = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][date.getMonth()];
  return `${m} ${date.getDate()} ${date.getFullYear()}`;
}

function formatDuration(mins?: number | null) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/* ------------------------------ Small UI: Confirm Modal ------------------------------ */

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  onCancel,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[999] grid place-items-center p-4"
      aria-modal
      role="dialog"
    >
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === overlayRef.current) onCancel();
        }}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/90 p-6 shadow-2xl backdrop-blur-xl">
        <h3 className="mb-2 text-xl font-bold text-zinc-900">{title}</h3>
        <p className="mb-6 text-sm text-zinc-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60",
              confirmVariant === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-amber-500 hover:bg-amber-600",
            ].join(" ")}
          >
            {loading ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Modal ----------------------------------- */

type ModalMode = "add" | "edit";

function PackageModal({
  open,
  mode,
  onClose,
  onSave, // returns true on success
  services, // [{id,name,duration}]
  initialValues,
}: {
  open: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (data: packageFormData, expectedDuration: number) => Promise<boolean>;
  services: { id: string; name: string; duration: number }[];
  initialValues?: Partial<packageFormData>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<packageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      status: "Active",
      start_date: undefined as unknown as Date,
      end_date: undefined as unknown as Date,
      price: undefined as unknown as number,
      included_services: [],
    },
  });

  const { field: includedField } = useController({
    name: "included_services",
    control,
    defaultValue: [],
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialValues) {
      reset({
        name: initialValues.name ?? "",
        status: (initialValues.status as any) ?? "Active",
        start_date: initialValues.start_date
          ? new Date(initialValues.start_date as any)
          : (undefined as unknown as Date),
        end_date: initialValues.end_date
          ? new Date(initialValues.end_date as any)
          : (undefined as unknown as Date),
        price:
          (initialValues.price as number) ?? (undefined as unknown as number),
        included_services: (initialValues.included_services as string[]) ?? [],
      });
    } else {
      reset({
        name: "",
        status: "Active",
        start_date: undefined as unknown as Date,
        end_date: undefined as unknown as Date,
        price: undefined as unknown as number,
        included_services: [],
      });
    }
  }, [open, mode, initialValues, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedIds = (includedField.value as string[] | undefined) ?? [];
  const expectedDuration = useMemo(() => {
    const map = new Map(services.map((s) => [s.id, s.duration]));
    return selectedIds.reduce((sum: number, id: string) => {
      const d = map.get(id);
      return sum + (typeof d === "number" ? d : 0);
    }, 0);
  }, [selectedIds, services]);

  const submit = async (data: packageFormData) => {
    const ok = await onSave(
      { ...data, included_services: Array.from(new Set(selectedIds)) },
      expectedDuration
    );
    if (ok) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[998] grid place-items-center p-4"
      aria-modal
      role="dialog"
    >
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200/60 bg-white/70 px-6 py-4 backdrop-blur-xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
              {mode === "edit" ? "Edit Package" : "Add Package"}
            </h2>
            <p className="text-xs text-zinc-500">
              {mode === "edit" ? "Update package details" : "Create a package"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(submit)}
          className="grid gap-6 p-6 md:grid-cols-2"
        >
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">
                Name
              </label>
              <input
                type="text"
                {...register("name")}
                className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Package name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-300"
                defaultValue="Active"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.status.message as string}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">
                  Start Date
                </label>
                <input
                  type="date"
                  {...register("start_date")}
                  className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-300"
                />
                {errors.start_date && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.start_date.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">
                  End Date
                </label>
                <input
                  type="date"
                  {...register("end_date")}
                  className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-300"
                />
                {errors.end_date && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.end_date.message as string}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">
                Included Services
              </label>
              <p className="mb-2 text-xs text-zinc-500">
                Selected: {((includedField.value as string[]) ?? []).length}
              </p>

              <div className="h-44 w-full overflow-auto rounded-xl border border-zinc-200 bg-white/70 p-2">
                {services.length === 0 && (
                  <p className="px-1 text-sm text-zinc-500">
                    No services available.
                  </p>
                )}
                <ul className="space-y-2">
                  {services.map((s) => {
                    const checked = (includedField.value as string[])?.includes(
                      s.id
                    );
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-zinc-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              const current = new Set(
                                (includedField.value as string[]) ?? []
                              );
                              if (e.target.checked) current.add(s.id);
                              else current.delete(s.id);
                              includedField.onChange(Array.from(current));
                            }}
                          />
                          <span className="text-sm text-zinc-800">
                            {s.name}{" "}
                            <span className="text-xs text-zinc-500">
                              ({formatDuration(s.duration)})
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {errors.included_services && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.included_services.message as string}
                </p>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-amber-700 underline"
                  onClick={() => {
                    const all = Array.from(new Set(services.map((s) => s.id)));
                    includedField.onChange(all);
                  }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs text-zinc-600 underline"
                  onClick={() => includedField.onChange([])}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Expected Duration (read-only) */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">
                  Expected Duration
                </label>
                <input
                  type="text"
                  value={formatDuration(
                    ((includedField.value as string[]) ?? []).reduce(
                      (sum, id) =>
                        sum +
                        (services.find((s) => s.id === id)?.duration ?? 0),
                      0
                    )
                  )}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                  title="Auto-calculated from selected services"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="₱0.00"
                  {...register("price", { valueAsNumber: true })}
                  className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-300"
                />
                {errors.price && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.price.message as string}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 border-t border-zinc-200/70 pt-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
              >
                {isSubmitting
                  ? mode === "edit"
                    ? "Updating…"
                    : "Saving…"
                  : mode === "edit"
                  ? "Update"
                  : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- Main component ---------------------------- */

const AdminPackages: React.FC = () => {
  const { services: svc } = useServicesAndStylistContext();
  const {
    createPackage,
    packages,
    fetchPackages,
    updatePackage,
    deletePackage,
  } = usePromoManagementContext() as unknown as {
    createPackage: (
      d: packageFormData,
      expectedDuration: number
    ) => Promise<{ success: boolean; packageId?: string; message?: string }>;
    updatePackage: (
      id: string,
      d: packageFormData,
      expectedDuration: number
    ) => Promise<{ success: boolean; message?: string }>;
    deletePackage: (
      id: string
    ) => Promise<{ success: boolean; message?: string }>;
    fetchPackages: () => Promise<any>;
    packages: any[];
  };

  const [activeTab, setActiveTab] = useState<"packages" | "discount">(
    "packages"
  );

  const normalizedServices = useMemo(
    () =>
      (svc ?? []).map((s: any) => ({
        id: String(s.service_id),
        name: String(s.name),
        duration: Number(s.duration ?? 0),
      })),
    [svc]
  );

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<
    Partial<packageFormData> | undefined
  >(undefined);

  // Delete confirmation state
  const [openDelete, setOpenDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const serviceNameMap = useMemo(
    () => new Map(normalizedServices.map((s) => [s.id, s.name] as const)),
    [normalizedServices]
  );

  useEffect(() => {
    if (activeTab === "packages") void fetchPackages();
  }, [fetchPackages, activeTab]);

  // Add flow
  const handleSaveAdd = async (
    data: packageFormData,
    expectedDuration: number
  ): Promise<boolean> => {
    const res = await createPackage(data, expectedDuration);
    if (!res.success) {
      alert(`Failed to create package: ${res.message}`);
      return false;
    }
    await fetchPackages();
    return true;
  };

  // Edit flow
  const openEditModalFor = (pkg: any) => {
    setEditingId(String(pkg.package_id));
    setEditingInitial({
      name: pkg.name,
      status: pkg.status,
      price: Number(pkg.price),
      start_date: new Date(pkg.start_date),
      end_date: new Date(pkg.end_date),
      included_services: (pkg.included_services ?? []) as string[],
    });
    setOpenEdit(true);
  };

  const handleSaveEdit = async (
    data: packageFormData,
    expectedDuration: number
  ): Promise<boolean> => {
    if (!editingId) return false;
    const res = await updatePackage(editingId, data, expectedDuration);
    if (!res.success) {
      alert(`Failed to update package: ${res.message}`);
      return false;
    }
    await fetchPackages();
    return true;
  };

  // Delete flow
  const openDeleteModalFor = (pkg: any) => {
    setDeletingId(String(pkg.package_id));
    setDeletingName(String(pkg.name));
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const res = await deletePackage(deletingId);
      if (!res.success) {
        alert(`Failed to delete package: ${res.message}`);
      } else {
        await fetchPackages();
      }
    } finally {
      setDeleting(false);
      setOpenDelete(false);
      setDeletingId(null);
      setDeletingName("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-bold">Promo Management</h1>

      {/* Tabs + Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          className={[
            "relative rounded-full px-4 py-2 text-sm font-semibold transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
            activeTab === "packages"
              ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
              : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
          ].join(" ")}
          onClick={() => setActiveTab("packages")}
        >
          Packages
        </button>
        <button
          className={[
            "relative rounded-full px-4 py-2 text-sm font-semibold transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
            activeTab === "discount"
              ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
              : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
          ].join(" ")}
          onClick={() => setActiveTab("discount")}
        >
          Discount
        </button>

        {activeTab === "packages" && (
          <div className="ml-auto">
            <button
              onClick={() => setOpenAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
            >
              <Plus className="h-4 w-4" />
              Add Package
            </button>
          </div>
        )}
      </div>

      {/* Content by tab */}
      {activeTab === "discount" ? (
        <div className="mt-6">
          <AdminDiscount />
        </div>
      ) : (
        <>
          {/* Packages Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur-sm">
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
                  <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">
                      Included Services
                    </th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold">
                      Expected Duration
                    </th>
                    <th className="px-5 py-3 font-semibold">Validity</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(packages ?? []).map((p: any, i: number) => {
                    const row: Row = {
                      id: String(p.package_id),
                      name: String(p.name),
                      type: "Package",
                      included_services: (p.included_services ??
                        []) as string[],
                      price: Number(p.price),
                      expected_duration:
                        typeof p.expected_duration === "number"
                          ? p.expected_duration
                          : Number(p.expected_duration ?? 0) || 0,
                      validity: `${humanDate(p.start_date)} – ${humanDate(
                        p.end_date
                      )}`,
                      status: (p.status as Row["status"]) ?? "Active",
                    };
                    return (
                      <tr
                        key={row.id}
                        className={[
                          "transition-colors",
                          i % 2 === 0 ? "bg-white" : "bg-amber-50/30",
                          "hover:bg-amber-50/60",
                        ].join(" ")}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-900">
                            {row.name}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-zinc-800">{row.type}</td>
                        <td className="px-5 py-3 text-zinc-800">
                          {row.included_services
                            .map((id) => serviceNameMap.get(id))
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td className="px-5 py-3 text-zinc-900">
                          {peso(row.price)}
                        </td>
                        <td className="px-5 py-3 text-zinc-900">
                          {formatDuration(row.expected_duration ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-zinc-800">
                          {row.validity}
                        </td>
                        <td className="px-5 py-3">
                          <StatusPill value={row.status} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="inline-flex items-center rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                              title="Edit"
                              onClick={() => openEditModalFor(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex items-center rounded-lg p-2 text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                              title="Delete"
                              onClick={() => openDeleteModalFor(p)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!packages || packages.length === 0) && (
                    <tr>
                      <td
                        className="px-5 py-10 text-center text-zinc-500"
                        colSpan={8}
                      >
                        No packages yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Add Modal */}
          <PackageModal
            open={openAdd}
            mode="add"
            onClose={() => setOpenAdd(false)}
            onSave={handleSaveAdd}
            services={normalizedServices}
          />

          {/* Edit Modal */}
          <PackageModal
            open={openEdit}
            mode="edit"
            onClose={() => setOpenEdit(false)}
            onSave={handleSaveEdit}
            services={normalizedServices}
            initialValues={editingInitial}
          />

          {/* Delete Confirmation Modal */}
          <ConfirmModal
            open={openDelete}
            title="Delete Package?"
            message={`This will remove all linked services and hide "${deletingName}" from your list. You can restore it later from the database by setting "display" back to true.`}
            confirmText="Delete"
            confirmVariant="danger"
            onCancel={() => setOpenDelete(false)}
            onConfirm={confirmDelete}
            loading={deleting}
          />
        </>
      )}
    </div>
  );
};

export default AdminPackages;
