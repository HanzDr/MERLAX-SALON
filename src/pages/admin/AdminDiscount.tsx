// src/pages/admin/AdminDiscount.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useForm, useController } from "react-hook-form";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";
import { usePromoManagementContext } from "@/features/promo-management/context/promoManagementContext";

/* ------------------------------- Types ---------------------------------- */

type DiscountType = "Fixed" | "Percentage";
type AppliesTo = "Service" | "Package";

type DiscountRow = {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // Fixed: PHP; Percentage: %
  applies_to: AppliesTo;
  included_services: string[]; // item IDs (services OR packages)
  discounted_min?: number | null; // computed, UI only
  discounted_max?: number | null; // computed, UI only
  start_date?: string | null;
  end_date?: string | null;
  uses?: number | null;
  status: "Active" | "Inactive";
};

type DiscountFormData = {
  name: string;
  type: DiscountType;
  value: number;
  applies_to: AppliesTo;
  included_services: string[]; // item IDs (services OR packages)
  discounted?: number | null; // UI only, not saved
  start_date?: Date | null;
  end_date?: Date | null;
  uses?: number | null;
  status: "Active" | "Inactive";
};

type ServiceItem = {
  id: string;
  name: string;
  min_price?: number;
  max_price?: number;
};
type PackageItem = { id: string; name: string; price?: number };

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

// Local YYYY-MM-DD (no timezone offset surprises)
const toLocalISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayLocalISO = () => toLocalISODate(new Date());

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
  serviceItems, // normalized services [{id,name,min_price,max_price}]
  packageItems, // normalized packages [{id,name,price}]
  initialValues,
}: {
  open: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (data: DiscountFormData) => Promise<boolean>;
  serviceItems: ServiceItem[];
  packageItems: PackageItem[];
  initialValues?: Partial<DiscountFormData>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const todayISO = todayLocalISO();

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
      status: "Active",
    },
  });

  // included_services controlled array
  const { field: includedField } = useController({
    name: "included_services",
    control,
    defaultValue: [],
  });

  // Prefill on open for edit / reset on add
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

  // Switch item source by applies_to (no auto-clear here; we clear on user change)
  const appliesTo = watch("applies_to");
  const isService = appliesTo === "Service";
  const currentItems = isService ? serviceItems : packageItems;

  const selectedIds = (includedField.value as string[] | undefined) ?? [];
  const type = watch("type");
  const value = watch("value") as number | undefined;

  // Subtotals
  const { subtotalMin, subtotalMax } = useMemo(() => {
    if (!currentItems?.length || !selectedIds?.length) {
      return { subtotalMin: 0, subtotalMax: 0 };
    }
    if (isService) {
      const byId = new Map(
        (currentItems as ServiceItem[]).map((s) => [
          s.id,
          {
            min: Number(s.min_price ?? 0),
            max: Number(s.max_price ?? s.min_price ?? 0),
          },
        ])
      );
      let min = 0;
      let max = 0;
      for (const id of selectedIds) {
        const p = byId.get(id);
        if (!p) continue;
        min += p.min;
        max += Math.max(p.max, p.min);
      }
      return { subtotalMin: min, subtotalMax: Math.max(max, min) };
    } else {
      const byId = new Map(
        (currentItems as PackageItem[]).map((p) => [p.id, Number(p.price ?? 0)])
      );
      const sum = selectedIds.reduce((acc, id) => acc + (byId.get(id) ?? 0), 0);
      return { subtotalMin: sum, subtotalMax: sum };
    }
  }, [currentItems, selectedIds, isService]);

  // Compute discounted total(s) (read-only)
  const { discountedMin, discountedMax } = useMemo(() => {
    if (!value || value < 0)
      return { discountedMin: subtotalMin, discountedMax: subtotalMax };
    if (type === "Percentage") {
      const pct = Math.min(Math.max(value, 0), 100);
      const factor = 1 - pct / 100;
      return {
        discountedMin: Math.max(subtotalMin * factor, 0),
        discountedMax: Math.max(subtotalMax * factor, 0),
      };
    }
    // Fixed PHP off — subtract same amount across the range
    return {
      discountedMin: Math.max(subtotalMin - value, 0),
      discountedMax: Math.max(subtotalMax - value, 0),
    };
  }, [subtotalMin, subtotalMax, type, value]);

  // For end date min (>= start date or today)
  const startDateVal = watch("start_date") as Date | undefined;
  const dynamicEndMinISO = startDateVal
    ? toLocalISODate(startDateVal)
    : todayISO;

  // register for applies_to, but clear included items only when the USER toggles it
  const appliesToReg = register("applies_to");

  const submit = async (data: DiscountFormData) => {
    const deduped = Array.from(new Set(selectedIds));
    const ok = await onSave({
      ...data,
      included_services: deduped,
    });
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

        <h2 className="mb-1 text-3xl font-bold">
          {mode === "edit" ? "Edit Discount" : "Add Discount"}
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Add discount and fill in the details for customer to use
        </p>

        <form
          onSubmit={handleSubmit(submit)}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {/* Left column */}
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
                placeholder={watch("type") === "Percentage" ? "15" : "₱200.00"}
                {...register("value", {
                  valueAsNumber: true,
                  validate: (v) => {
                    if (v == null || Number.isNaN(v)) return true;
                    if (v < 0) return "Value must be ≥ 0";
                    if (watch("type") === "Percentage" && v > 100)
                      return "Percentage can’t exceed 100";
                    return true;
                  },
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.value && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.value.message as string}
                </p>
              )}
            </div>

            {/* Applies To */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Applies To:
              </label>
              <select
                {...appliesToReg}
                onChange={(e) => {
                  appliesToReg.onChange(e); // update form value
                  includedField.onChange([]); // clear selections only on USER toggle
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="Service">Service</option>
                <option value="Package">Package</option>
              </select>
            </div>

            {/* Start Date (no past dates) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date:
              </label>
              <input
                type="date"
                min={todayISO}
                {...register("start_date", {
                  valueAsDate: true,
                  validate: (v) => {
                    if (!v) return true; // optional
                    const sel = toLocalISODate(v);
                    if (sel < todayISO)
                      return "Start date can’t be in the past";
                    return true;
                  },
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.start_date.message as string}
                </p>
              )}
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

          {/* Right column — Included Items + Discounted (read-only) + End Date */}
          <div className="space-y-4">
            {/* Included Items: list of checkboxes (services OR packages) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                {isService ? "Included Services :" : "Included Packages :"}
              </label>

              <div className="h-40 w-full overflow-auto rounded-lg border border-gray-300 p-2">
                {currentItems.length === 0 && (
                  <p className="px-1 text-sm text-gray-500">
                    No items available.
                  </p>
                )}
                <ul className="space-y-2">
                  {currentItems.map((s: any) => {
                    const selected = (includedField.value as string[]).includes(
                      s.id
                    );
                    const rightText = isService
                      ? ` — ${peso(Number(s.min_price ?? 0))} — ${peso(
                          Number(s.max_price ?? s.min_price ?? 0)
                        )}`
                      : typeof s.price === "number"
                      ? ` — ${peso(Number(s.price))}`
                      : "";
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
                          <span className="text-sm">
                            {s.name}
                            {rightText}
                          </span>
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
                    includedField.onChange(currentItems.map((s: any) => s.id))
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

            {/* Discounted (READ-ONLY, computed) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Discounted Total:
              </label>
              <input
                type="text"
                readOnly
                value={
                  !selectedIds || selectedIds.length === 0
                    ? "—"
                    : isService
                    ? `${peso(discountedMin)} — ${peso(
                        discountedMax
                      )} (from ${peso(subtotalMin)} — ${peso(subtotalMax)})`
                    : `${peso(discountedMin)} (from ${peso(subtotalMin)})`
                }
                className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 outline-none"
                title="Calculated from selected items and discount value"
              />
            </div>

            {/* End Date (no past dates, and not before start date) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                End Date:
              </label>
              <input
                type="date"
                min={dynamicEndMinISO}
                {...register("end_date", {
                  valueAsDate: true,
                  validate: (v, form) => {
                    if (!v) return true; // optional
                    const endISO = toLocalISODate(v);
                    if (endISO < todayISO)
                      return "End date can’t be in the past";
                    const s = form.start_date as Date | undefined | null;
                    if (s) {
                      const startISO = toLocalISODate(s);
                      if (endISO < startISO)
                        return "End date can’t be before the start date";
                    }
                    return true;
                  },
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.end_date.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
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

  // Pull from promo-management context (backed by usePromoManagement hook)
  const {
    packages,
    fetchPackages,
    discounts,
    fetchDiscounts,
    addDiscount,
    deleteDiscount,
  } = usePromoManagementContext();

  const [openAdd, setOpenAdd] = useState(false);

  // Fetch packages & discounts on mount
  useEffect(() => {
    fetchPackages?.();
    fetchDiscounts?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize services to {id, name, min_price, max_price}
  const normalizedServices: ServiceItem[] = useMemo(
    () =>
      (svc ?? []).map((s: any) => ({
        id: String(s.service_id ?? s.id ?? s.uuid),
        name: String(s.name),
        min_price: Number(s.min_price ?? s.price_min ?? 0),
        max_price: Number(
          s.max_price ?? s.price_max ?? s.min_price ?? s.price_min ?? 0
        ),
      })),
    [svc]
  );

  // Normalize packages to {id, name, price}
  const normalizedPackages: PackageItem[] = useMemo(
    () =>
      (packages ?? []).map((p: any) => ({
        id: String(p.package_id ?? p.id ?? p.uuid),
        name: String(p.name),
        price: Number(p.price ?? p.total_price ?? 0),
      })),
    [packages]
  );

  // Map for displaying names in table across both sources
  const allItemsMap = useMemo(() => {
    const m = new Map<string, string>();
    normalizedServices.forEach((s) => m.set(s.id, s.name));
    normalizedPackages.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [normalizedServices, normalizedPackages]);

  // Utility to compute discounted min/max from a DiscountFormData
  const computeDiscountedRange = (d: DiscountFormData) => {
    if (d.applies_to === "Package") {
      const byId = new Map(
        normalizedPackages.map((p) => [p.id, Number(p.price ?? 0)])
      );
      const sum = (d.included_services ?? []).reduce(
        (acc, id) => acc + (byId.get(id) ?? 0),
        0
      );
      if (!d.value || d.value < 0) return { min: sum, max: sum };
      if (d.type === "Percentage") {
        const pct = Math.min(Math.max(d.value, 0), 100);
        const factor = 1 - pct / 100;
        const val = Math.max(sum * factor, 0);
        return { min: val, max: val };
      }
      const val = Math.max(sum - d.value, 0);
      return { min: val, max: val };
    } else {
      const byId = new Map(
        normalizedServices.map((s) => [
          s.id,
          {
            min: Number(s.min_price ?? 0),
            max: Number(s.max_price ?? s.min_price ?? 0),
          },
        ])
      );
      let subtotalMin = 0;
      let subtotalMax = 0;
      for (const id of d.included_services ?? []) {
        const p = byId.get(id);
        if (!p) continue;
        subtotalMin += p.min;
        subtotalMax += Math.max(p.max, p.min);
      }
      if (!d.value || d.value < 0)
        return { min: subtotalMin, max: subtotalMax };
      if (d.type === "Percentage") {
        const pct = Math.min(Math.max(d.value, 0), 100);
        const factor = 1 - pct / 100;
        return {
          min: Math.max(subtotalMin * factor, 0),
          max: Math.max(subtotalMax * factor, 0),
        };
      }
      return {
        min: Math.max(subtotalMin - d.value, 0),
        max: Math.max(subtotalMax - d.value, 0),
      };
    }
  };

  // Local UI table rows (derived from discounts + normalized items)
  const [rows, setRows] = useState<DiscountRow[]>([]);

  // Whenever discounts or normalized items change, rebuild UI rows
  useEffect(() => {
    const next = (discounts ?? []).map((d: any): DiscountRow => {
      const formLike: DiscountFormData = {
        name: d.name,
        type: d.type,
        value: d.value,
        applies_to: d.applies_to,
        included_services: d.included_services ?? [],
        start_date: d.start_date ? new Date(d.start_date) : null,
        end_date: d.end_date ? new Date(d.end_date) : null,
        uses: d.amount_of_uses ?? null,
        status: d.status,
      };
      const { min, max } = computeDiscountedRange(formLike);
      return {
        id: String(d.discount_id ?? d.id),
        name: String(d.name),
        type: d.type as DiscountType,
        value: Number(d.value),
        applies_to: d.applies_to as AppliesTo,
        included_services: Array.from(new Set(d.included_services ?? [])),
        discounted_min: min,
        discounted_max: max,
        start_date: d.start_date ? String(d.start_date) : null,
        end_date: d.end_date ? String(d.end_date) : null,
        uses: d.amount_of_uses == null ? null : Number(d.amount_of_uses),
        status: d.status as "Active" | "Inactive",
      };
    });
    setRows(next);
  }, [discounts, normalizedServices, normalizedPackages]); // normalized lists affect computed ranges

  // Add — uses addDiscount() then refreshes from backend
  const handleSaveAdd = async (d: DiscountFormData): Promise<boolean> => {
    try {
      if (!addDiscount) return false;
      const res = await addDiscount({
        name: d.name,
        type: d.type,
        value: d.value,
        applies_to: d.applies_to,
        included_services: d.included_services ?? [],
        start_date: d.start_date ?? null,
        end_date: d.end_date ?? null,
        amount_of_uses: d.uses ?? null,
        status: d.status,
      } as any);

      if (!res?.success) {
        console.error("Failed to add discount:", (res as any)?.message);
        return false;
      }

      await fetchDiscounts?.(); // refresh table from DB
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Edit — still local UI only (no backend update endpoint yet)
  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<
    Partial<DiscountFormData> | undefined
  >(undefined);

  const openEditModalFor = (r: DiscountRow) => {
    setEditingId(r.id);
    setEditingInitial({
      name: r.name,
      type: r.type,
      value: r.value,
      applies_to: r.applies_to,
      included_services: r.included_services,
      start_date: r.start_date ? new Date(r.start_date) : undefined,
      end_date: r.end_date ? new Date(r.end_date) : undefined,
      uses: r.uses ?? undefined,
      status: r.status,
    });
    setOpenEdit(true);
  };

  const handleSaveEdit = async (d: DiscountFormData): Promise<boolean> => {
    if (!editingId) return false;
    const { min, max } = computeDiscountedRange(d);
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
              discounted_min: min,
              discounted_max: max,
              start_date: d.start_date
                ? new Date(d.start_date).toISOString()
                : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              uses: d.uses ?? null,
              status: d.status,
            }
          : r
      )
    );
    // Note: not persisted; add an update endpoint in hook later if needed
    return true;
  };

  // Delete — calls deleteDiscount() (soft delete), then updates UI
  const [openDelete, setOpenDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");

  const openDeleteModalFor = (r: DiscountRow) => {
    setDeletingId(r.id);
    setDeletingName(r.name);
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!deletingId || !deleteDiscount) return;
    const res = await deleteDiscount(deletingId);
    if (res?.success) {
      setRows((prev) => prev.filter((r) => r.id !== deletingId));
    } else {
      console.error("Failed to delete discount:", (res as any)?.message);
    }
    setOpenDelete(false);
    setDeletingId(null);
    setDeletingName("");
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
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
                Included Items
              </th>
              <th className="px-4 py-3 text-left font-semibold">Discounted</th>
              <th className="px-4 py-3 text-left font-semibold">Start</th>
              <th className="px-4 py-3 text-left font-semibold">End</th>
              <th className="px-4 py-3 text-left font-semibold">Uses</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => {
              const discountedCell =
                typeof r.discounted_min === "number" &&
                typeof r.discounted_max === "number"
                  ? r.discounted_min === r.discounted_max
                    ? peso(r.discounted_min)
                    : `${peso(r.discounted_min)} — ${peso(r.discounted_max)}`
                  : "—";
              return (
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
                      .map((id) => allItemsMap.get(id) ?? id)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-4">{discountedCell}</td>
                  <td className="px-4 py-4">{humanDate(r.start_date)}</td>
                  <td className="px-4 py-4">{humanDate(r.end_date)}</td>
                  <td className="px-4 py-4">{r.uses ?? "—"}</td>
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
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={11}
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
        serviceItems={normalizedServices}
        packageItems={normalizedPackages}
      />

      {/* Edit Modal */}
      <DiscountModal
        key={openEdit ? editingId ?? "edit" : "edit-closed"} // force clean mount per row
        open={openEdit}
        mode="edit"
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        serviceItems={normalizedServices}
        packageItems={normalizedPackages}
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
