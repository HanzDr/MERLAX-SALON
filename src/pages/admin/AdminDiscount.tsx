// src/pages/admin/AdminDiscount.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useForm, useController } from "react-hook-form";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";

/* ------------------------------- Types ---------------------------------- */

type DiscountType = "Fixed" | "Percentage";
type AppliesTo = "Service" | "Package";

type DiscountRow = {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // Fixed: PHP; Percentage: %
  applies_to: AppliesTo;
  included_services: string[]; // service IDs
  discounted?: number | null; // optional, UI only
  start_date?: string | null;
  end_date?: string | null;
  uses?: number | null;
  code?: string | null;
  status: "Active" | "Inactive";
};

type DiscountFormData = {
  name: string;
  type: DiscountType;
  value: number;
  applies_to: AppliesTo;
  included_services: string[];
  discounted?: number | null;
  start_date?: Date | null;
  end_date?: Date | null;
  uses?: number | null;
  code?: string | null;
  status: "Active" | "Inactive";
};

/* ------------------------------ Helpers --------------------------------- */

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n);

const humanDate = (d?: string | Date | null) => {
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
};

/* ------------------------------ Confirm --------------------------------- */

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onCancel,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Modal --------------------------------- */

type ModalMode = "add" | "edit";

function DiscountModal({
  open,
  mode,
  onClose,
  onSave,
  services, // [{id,name}]
  initialValues,
}: {
  open: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (data: DiscountFormData) => Promise<boolean>;
  services: { id: string; name: string }[];
  initialValues?: Partial<DiscountFormData>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    watch,
  } = useForm<DiscountFormData>({
    defaultValues: {
      name: "",
      type: "Fixed",
      value: undefined as unknown as number,
      applies_to: "Service",
      included_services: [],
      discounted: undefined,
      start_date: undefined as unknown as Date,
      end_date: undefined as unknown as Date,
      uses: undefined,
      code: "",
      status: "Active",
    },
  });

  // — included_services controlled array (same behavior as Packages modal)
  const { field: includedField } = useController({
    name: "included_services",
    control,
    defaultValue: [],
  });

  // Prefill on open for edit
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialValues) {
      reset({
        name: initialValues.name ?? "",
        type: (initialValues.type as DiscountType) ?? "Fixed",
        value:
          (initialValues.value as number) ?? (undefined as unknown as number),
        applies_to: (initialValues.applies_to as AppliesTo) ?? "Service",
        included_services: (initialValues.included_services as string[]) ?? [],
        discounted: (initialValues.discounted as number | null) ?? undefined,
        start_date: initialValues.start_date
          ? new Date(initialValues.start_date as any)
          : (undefined as unknown as Date),
        end_date: initialValues.end_date
          ? new Date(initialValues.end_date as any)
          : (undefined as unknown as Date),
        uses:
          (initialValues.uses as number | null) ??
          (undefined as unknown as number),
        code: (initialValues.code as string | null) ?? "",
        status: (initialValues.status as "Active" | "Inactive") ?? "Active",
      });
    } else {
      reset({
        name: "",
        type: "Fixed",
        value: undefined as unknown as number,
        applies_to: "Service",
        included_services: [],
        discounted: undefined,
        start_date: undefined as unknown as Date,
        end_date: undefined as unknown as Date,
        uses: undefined,
        code: "",
        status: "Active",
      });
    }
  }, [open, mode, initialValues, reset]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedIds = (includedField.value as string[] | undefined) ?? [];
  const type = watch("type");

  const submit = async (data: DiscountFormData) => {
    const deduped = Array.from(new Set(selectedIds));
    const ok = await onSave({ ...data, included_services: deduped });
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
      <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-3xl font-bold">Add Discount</h2>
        <p className="mb-6 text-sm text-gray-500">
          Add discount and fill in the details for customer to use
        </p>

        <form
          onSubmit={handleSubmit(submit)}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {/* Left column — matches screenshot fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium">Name:</label>
              <input
                type="text"
                {...register("name", { required: "Required" })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="mb-1 block text-sm font-medium">Type:</label>
              <select
                {...register("type")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="Fixed">Fixed</option>
                <option value="Percentage">Percentage</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="mb-1 block text-sm font-medium">Value:</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder={type === "Percentage" ? "15" : "₱200.00"}
                {...register("value", { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Applies To */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Applies To:
              </label>
              <select
                {...register("applies_to")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="Service">Service</option>
                <option value="Package">Package</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date:
              </label>
              <input
                type="date"
                {...register("start_date")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Amount of Uses */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Amount of Uses:
              </label>
              <input
                type="number"
                {...register("uses", { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm font-medium">Status:</span>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  {...register("status")}
                  checked={watch("status") === "Active"}
                  onChange={(e) =>
                    (e.target as HTMLInputElement).checked
                      ? (reset({ ...watch(), status: "Active" }), undefined)
                      : (reset({ ...watch(), status: "Inactive" }), undefined)
                  }
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>

          {/* Right column — Included Services + Discounted + End Date + Code */}
          <div className="space-y-4">
            {/* Included Services box (same behavior as Packages modal) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Included Services :
                </label>
                <button
                  type="button"
                  className="rounded bg-amber-400 px-3 py-1 text-xs font-medium text-black shadow hover:bg-amber-500"
                  onClick={() => {
                    // placeholder “Add Service” button — can open another picker later
                    const all = Array.from(new Set(services.map((s) => s.id)));
                    includedField.onChange(all);
                  }}
                >
                  Add Service
                </button>
              </div>

              <div className="h-40 w-full overflow-auto rounded-lg border border-gray-300 p-2">
                {services.length === 0 && (
                  <p className="px-1 text-sm text-gray-500">
                    No services available.
                  </p>
                )}
                <ul className="space-y-2">
                  {services.map((s) => {
                    const selected = (includedField.value as string[]).includes(
                      s.id
                    );
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selected}
                            onChange={(e) => {
                              const current = new Set(
                                (includedField.value as string[]) ?? []
                              );
                              if ((e.target as HTMLInputElement).checked)
                                current.add(s.id);
                              else current.delete(s.id);
                              includedField.onChange(Array.from(current));
                            }}
                          />
                          <span className="text-sm">{s.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  className="text-xs text-gray-600 underline"
                  onClick={() =>
                    includedField.onChange(services.map((s) => s.id))
                  }
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

            {/* Discounted (free text for now) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Discounted:
              </label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="₱1800.00"
                {...register("discounted", { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                End Date:
              </label>
              <input
                type="date"
                {...register("end_date")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Code */}
            <div>
              <label className="mb-1 block text-sm font-medium">Code:</label>
              <input
                type="text"
                {...register("code")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Buttons (styled like screenshot) */}
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
                : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------- Page ----------------------------------- */

const AdminDiscount: React.FC = () => {
  const { services: svc } = useServicesAndStylistContext();

  // Services to {id, name}
  const normalizedServices = useMemo(
    () =>
      (svc ?? []).map((s: any) => ({
        id: String(s.service_id),
        name: String(s.name),
      })),
    [svc]
  );

  // local UI state (no backend yet)
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<
    Partial<DiscountFormData> | undefined
  >(undefined);
  const [openDelete, setOpenDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");

  // Add
  const handleSaveAdd = async (d: DiscountFormData): Promise<boolean> => {
    const id = crypto.randomUUID();
    const row: DiscountRow = {
      id,
      name: d.name,
      type: d.type,
      value: d.value,
      applies_to: d.applies_to,
      included_services: d.included_services ?? [],
      discounted: d.discounted ?? null,
      start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
      end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
      uses: d.uses ?? null,
      code: d.code ?? "",
      status: d.status,
    };
    setRows((prev) => [row, ...prev]);
    return true;
  };

  // Edit
  const openEditModalFor = (r: DiscountRow) => {
    setEditingId(r.id);
    setEditingInitial({
      name: r.name,
      type: r.type,
      value: r.value,
      applies_to: r.applies_to,
      included_services: r.included_services,
      discounted: r.discounted ?? undefined,
      start_date: r.start_date ? new Date(r.start_date) : undefined,
      end_date: r.end_date ? new Date(r.end_date) : undefined,
      uses: r.uses ?? undefined,
      code: r.code ?? "",
      status: r.status,
    });
    setOpenEdit(true);
  };

  const handleSaveEdit = async (d: DiscountFormData): Promise<boolean> => {
    if (!editingId) return false;
    setRows((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? {
              ...r,
              name: d.name,
              type: d.type,
              value: d.value,
              applies_to: d.applies_to,
              included_services: d.included_services ?? [],
              discounted: d.discounted ?? null,
              start_date: d.start_date
                ? new Date(d.start_date).toISOString()
                : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              uses: d.uses ?? null,
              code: d.code ?? "",
              status: d.status,
            }
          : r
      )
    );
    return true;
  };

  // Delete
  const openDeleteModalFor = (r: DiscountRow) => {
    setDeletingId(r.id);
    setDeletingName(r.name);
    setOpenDelete(true);
  };
  const confirmDelete = () => {
    if (!deletingId) return;
    setRows((prev) => prev.filter((r) => r.id !== deletingId));
    setOpenDelete(false);
    setDeletingId(null);
    setDeletingName("");
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header for the Discounts page (Add button lives here) */}
      <div className="mb-4 flex items-center">
        <h2 className="text-2xl font-semibold">Discounts</h2>
        <div className="ml-auto">
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-medium text-black shadow hover:bg-amber-500"
          >
            <Plus className="h-5 w-5" />
            Add Discount
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Value</th>
              <th className="px-4 py-3 text-left font-semibold">Applies To</th>
              <th className="px-4 py-3 text-left font-semibold">
                Included Services
              </th>
              <th className="px-4 py-3 text-left font-semibold">Discounted</th>
              <th className="px-4 py-3 text-left font-semibold">Start</th>
              <th className="px-4 py-3 text-left font-semibold">End</th>
              <th className="px-4 py-3 text-left font-semibold">Uses</th>
              <th className="px-4 py-3 text-left font-semibold">Code</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={i % 2 === 0 ? "bg-orange-50/50" : "bg-white"}
              >
                <td className="px-4 py-4">{r.name}</td>
                <td className="px-4 py-4">{r.type}</td>
                <td className="px-4 py-4">
                  {r.type === "Percentage" ? `${r.value}%` : peso(r.value)}
                </td>
                <td className="px-4 py-4">{r.applies_to}</td>
                <td className="px-4 py-4">
                  {r.included_services
                    .map((id) => {
                      // show service names using context list
                      const svc = (normalizedServices || []).find(
                        (s) => s.id === id
                      );
                      return svc?.name ?? id;
                    })
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td className="px-4 py-4">
                  {typeof r.discounted === "number" ? peso(r.discounted) : "—"}
                </td>
                <td className="px-4 py-4">{humanDate(r.start_date)}</td>
                <td className="px-4 py-4">{humanDate(r.end_date)}</td>
                <td className="px-4 py-4">{r.uses ?? "—"}</td>
                <td className="px-4 py-4">{r.code ?? "—"}</td>
                <td className="px-4 py-4">
                  <span
                    className={
                      "rounded-full px-3 py-1 text-sm " +
                      (r.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600")
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <button
                      className="rounded p-1 hover:bg-gray-100"
                      title="Edit"
                      onClick={() => openEditModalFor(r)}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      className="rounded p-1 hover:bg-gray-100"
                      title="Delete"
                      onClick={() => openDeleteModalFor(r)}
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={12}
                >
                  No discounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <DiscountModal
        open={openAdd}
        mode="add"
        onClose={() => setOpenAdd(false)}
        onSave={handleSaveAdd}
        services={normalizedServices}
      />

      {/* Edit Modal */}
      <DiscountModal
        open={openEdit}
        mode="edit"
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        services={normalizedServices}
        initialValues={editingInitial}
      />

      {/* Delete Modal */}
      <ConfirmModal
        open={openDelete}
        title="Delete Discount?"
        message={`This will remove "${deletingName}" from your list.`}
        onCancel={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminDiscount;
