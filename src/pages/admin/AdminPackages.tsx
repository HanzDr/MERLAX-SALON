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
// 👇 import your Discount page (adjust path if needed)
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
    className={
      "rounded-full px-3 py-1 text-sm " +
      (value === "Active"
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-600")
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal
      role="dialog"
    >
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40"
        onClick={(e) => {
          if (e.target === overlayRef.current) onCancel();
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              "rounded-lg px-4 py-2 text-sm font-medium text-white shadow " +
              (confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-700 disabled:opacity-60"
                : "bg-amber-500 hover:bg-amber-600 disabled:opacity-60")
            }
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
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:items-center"
      aria-modal
      role="dialog"
    >
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      />
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-2xl font-semibold">
          {mode === "edit" ? "Edit Package" : "Add a Package"}
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          {mode === "edit" ? "Update Package" : "Create a Package"}
        </p>

        <form
          onSubmit={handleSubmit(submit)}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name:</label>
              <input
                type="text"
                {...register("name")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Package name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Status:</label>
              <select
                {...register("status")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
                defaultValue="Active"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.status.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date:
              </label>
              <input
                type="date"
                {...register("start_date")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.start_date.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                End Date:
              </label>
              <input
                type="date"
                {...register("end_date")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.end_date.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Included Services:
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Selected: {selectedIds.length}
              </p>

              <div className="h-40 w-full overflow-auto rounded-lg border border-gray-300 p-2">
                {services.length === 0 && (
                  <p className="px-1 text-sm text-gray-500">
                    No services available.
                  </p>
                )}
                <ul className="space-y-2">
                  {services.map((s) => {
                    const checked = selectedIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              const current = new Set(selectedIds);
                              if (e.target.checked) current.add(s.id);
                              else current.delete(s.id);
                              includedField.onChange(Array.from(current));
                            }}
                          />
                          <span className="text-sm">
                            {s.name}{" "}
                            <span className="text-xs text-gray-500">
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
                <p className="mt-1 text-sm text-red-600">
                  {errors.included_services.message as string}
                </p>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  className="text-xs text-gray-600 underline"
                  onClick={() => {
                    const all = Array.from(new Set(services.map((s) => s.id)));
                    includedField.onChange(all);
                  }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs text-gray-600 underline"
                  onClick={() => includedField.onChange([])}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Expected Duration (read-only) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Expected Duration:
              </label>
              <input
                type="text"
                value={formatDuration(expectedDuration)}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
                title="Auto-calculated from selected services"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Price:</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="₱0.00"
                {...register("price", { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.price.message as string}
                </p>
              )}
            </div>
          </div>

          <div className="col-span-1 mt-2 flex items-center justify-center gap-4 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-red-600 px-6 py-2 font-medium text-white shadow hover:bg-red-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-400 px-6 py-2 font-medium text-black shadow hover:bg-amber-500 disabled:opacity-50"
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

  // 👇 tab state
  const [activeTab, setActiveTab] = useState<"packages" | "discount">(
    "packages"
  );

  // Normalize services to {id,name,duration}
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
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">Promo Management</h1>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-6">
        <button
          className={
            "rounded-full px-4 py-2 text-sm font-medium shadow " +
            (activeTab === "packages"
              ? "bg-amber-400 text-black"
              : "text-gray-600 hover:bg-gray-100")
          }
          onClick={() => setActiveTab("packages")}
        >
          Packages
        </button>
        <button
          className={
            "rounded-full px-4 py-2 text-sm font-medium " +
            (activeTab === "discount"
              ? "bg-amber-400 text-black shadow"
              : "text-gray-600 hover:bg-gray-100")
          }
          onClick={() => setActiveTab("discount")}
        >
          Discount
        </button>

        {/* Only show the Add button on the Packages tab */}
        {activeTab === "packages" && (
          <div className="ml-auto">
            <button
              onClick={() => setOpenAdd(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-medium text-black shadow hover:bg-amber-500"
            >
              <Plus className="h-5 w-5" />
              Add Package
            </button>
          </div>
        )}
      </div>

      {/* Content by tab */}
      {activeTab === "discount" ? (
        <div className="mt-6">
          {/* Render your discount admin; put its own "Add" button inside that component */}
          <AdminDiscount />
        </div>
      ) : (
        <>
          {/* PACKAGES content */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Included Services
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Price</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Expected Duration
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Validity
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(packages ?? []).map((p: any, i: number) => {
                  const row: Row = {
                    id: String(p.package_id),
                    name: String(p.name),
                    type: "Package",
                    included_services: (p.included_services ?? []) as string[],
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
                      className={i % 2 === 0 ? "bg-orange-50/50" : "bg-white"}
                    >
                      <td className="px-4 py-4">{row.name}</td>
                      <td className="px-4 py-4">{row.type}</td>
                      <td className="px-4 py-4">
                        {row.included_services
                          .map((id) => serviceNameMap.get(id))
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-4">{peso(row.price)}</td>
                      <td className="px-4 py-4">
                        {formatDuration(row.expected_duration ?? 0)}
                      </td>
                      <td className="px-4 py-4">{row.validity}</td>
                      <td className="px-4 py-4">
                        <StatusPill value={row.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 text-gray-600">
                          <button
                            className="rounded p-1 hover:bg-gray-100"
                            title="Edit"
                            onClick={() => openEditModalFor(p)}
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            className="rounded p-1 hover:bg-gray-100"
                            title="Delete"
                            onClick={() => openDeleteModalFor(p)}
                          >
                            <Trash2 className="h-5 w-5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!packages || packages.length === 0) && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-gray-500"
                      colSpan={8}
                    >
                      No packages yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
