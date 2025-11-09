// components/AdminStylistSection.tsx
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, Plus, ChevronsUpDown, X } from "lucide-react";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  stylistSchema,
  type stylistSchemaData,
} from "@/validation/ServicesAndStylistSchema";
import { type DaySchedule } from "@/features/servicesAndStylist/types/ServiceAndStylistTypes";
import type { Stylist } from "@/features/servicesAndStylist/types/ServiceAndStylistTypes";

type Row = Stylist & {
  display?: boolean;
  services?: string[];
  schedule?: DaySchedule[];
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const normalizeTime = (t?: string | null) => {
  if (!t) return "";
  const m = String(t).match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  return m ? `${m[1]}:${m[2]}` : String(t).slice(0, 5);
};

const defaultSchedule: DaySchedule[] = DAYS.map((day) => ({
  day,
  start_time: "09:00",
  end_time: "17:00",
}));

/* ---------------- Popover Portal ---------------- */
function PopoverPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const portalEl = useRef<HTMLElement | null>(null);
  useEffect(() => {
    portalEl.current = document.body;
    setMounted(true);
  }, []);
  if (!mounted || !portalEl.current) return null;
  return createPortal(children, portalEl.current);
}

function useGlobalDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function computePopoverPosition(
  triggerRect: DOMRect,
  popoverSize: { w: number; h: number },
  offset = 8
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = triggerRect.bottom + offset;
  let left = triggerRect.left;

  if (top + popoverSize.h > vh) {
    top = Math.max(8, triggerRect.top - popoverSize.h - offset);
  }
  if (left + popoverSize.w > vw - 8) {
    left = Math.max(8, vw - 8 - popoverSize.w);
  }
  if (left < 8) left = 8;

  return { top, left };
}

const AdminStylistSection = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [selectedStylist, setSelectedStylist] = useState<Row | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  // Roles modal
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const {
    services,
    stylists,
    roles,
    addRole,
    deleteRole,
    reloadRoles, // (optional in your context)
    handleAddStylist,
    handleUpdateStylist,
    handleDeleteStylist,
    getStylistDetail,
    stylistServiceIdsByStylist,
  } = useServicesAndStylistContext();

  const [localStylists, setLocalStylists] = useState<Row[]>([]);

  // Services popover state
  const [openServicesFor, setOpenServicesFor] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [popoverMaxHeight, setPopoverMaxHeight] = useState<number>(256);

  useGlobalDismiss(() => setOpenServicesFor(null));

  useEffect(() => {
    setLocalStylists(stylists as unknown as Row[]);
  }, [stylists]);

  const serviceById = useMemo(() => {
    const m = new Map<string, any>();
    services.forEach((s: any) => m.set(s.service_id, s));
    return m;
  }, [services]);

  const serviceNameToId = useMemo(() => {
    const m = new Map<string, string>();
    services.forEach((s: any) => m.set(String(s.name).trim(), s.service_id));
    return m;
  }, [services]);

  const normalizeServiceIds = (arr?: string[]) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) =>
      serviceById.has(x) ? x : serviceNameToId.get(x) ?? x
    );
  };

  const buildScheduleForEdit = (
    existing?: DaySchedule[] | null
  ): DaySchedule[] => {
    const byDay = new Map((existing || []).map((row) => [row.day, row]));
    return DAYS.map((day) => {
      const row = byDay.get(day);
      return {
        day,
        start_time: normalizeTime(row?.start_time) || "09:00",
        end_time: normalizeTime(row?.end_time) || "17:00",
      };
    });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<stylistSchemaData>({
    resolver: zodResolver(stylistSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      role: "",
      services: [],
      schedule: defaultSchedule,
    },
    shouldUnregister: true,
    mode: "onChange",
  });

  const selectedServiceIds = (watch("services") ?? []) as string[];

  const toggleService = (id: string, checked: boolean) => {
    const next = new Set<string>(selectedServiceIds);
    if (checked) next.add(id);
    else next.delete(id);
    setValue("services", Array.from(next), {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onChangeRole = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue("role", e.target.value, { shouldDirty: true, shouldTouch: true });
  };

  const openAddModal = () => {
    setModalType("add");
    setSelectedStylist(null);
    setDetailError(null);
    setFormVersion((v) => v + 1);
    reset({
      name: "",
      email: "",
      phoneNumber: "",
      role: "",
      services: [],
      schedule: defaultSchedule,
    });
    setShowModal(true);
  };

  const openEditModal = async (stylist_id: string) => {
    setModalType("edit");
    setSelectedStylist(null);
    setDetailError(null);
    setShowModal(true);
    setLoadingDetail(true);
    setFormVersion((v) => v + 1);
    try {
      const { stylist, schedule, serviceIds } = await getStylistDetail(
        stylist_id
      );
      const normalizedServices = normalizeServiceIds(serviceIds);
      const merged: Row = {
        stylist_id: stylist.stylist_id,
        name: stylist.name,
        email: stylist.email,
        phoneNumber: stylist.phoneNumber,
        role: stylist.role,
        services: normalizedServices,
        schedule,
        display: stylist.display,
      };
      setSelectedStylist(merged);
      reset({
        name: stylist.name ?? "",
        email: stylist.email ?? "",
        phoneNumber: stylist.phoneNumber ?? "",
        role: stylist.role ?? "",
        services: normalizedServices,
        schedule: buildScheduleForEdit(schedule),
      });
    } catch (e) {
      console.error(e);
      setDetailError("Failed to load stylist details. Please try again.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStylist(null);
    setDetailError(null);
  };

  const onSubmit = async (formData: stylistSchemaData) => {
    try {
      if (modalType === "add") {
        const created = await handleAddStylist(formData, reset);
        if (created.success) {
          const s = created.stylist;
          setLocalStylists((prev) => [
            ...prev,
            {
              stylist_id: s.stylist_id,
              name: s.name,
              email: s.email,
              phoneNumber: s.phoneNumber,
              role: s.role,
              services: formData.services ?? [],
              schedule: formData.schedule ?? defaultSchedule,
              display: true,
            },
          ]);
        }
      } else if (modalType === "edit" && selectedStylist) {
        const res = await handleUpdateStylist(
          selectedStylist.stylist_id,
          formData,
          reset as any
        );
        if (res.success) {
          setLocalStylists((prev) =>
            prev.map((s) =>
              s.stylist_id === selectedStylist.stylist_id
                ? {
                    ...s,
                    name: formData.name,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    role: formData.role,
                    services: res.serviceIds,
                    schedule:
                      formData.schedule ?? buildScheduleForEdit(s.schedule),
                  }
                : s
            )
          );
        }
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await handleDeleteStylist(id);
      setLocalStylists((prev) => prev.filter((s) => s.stylist_id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNewRole = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    const res = await addRole(name);
    if (!res || !res.success) {
      console.error(res?.message ?? "Failed to add role");
      return;
    }
    setNewRoleName("");
    setValue("role", res.role?.role_name ?? "", {
      shouldDirty: true,
      shouldTouch: true,
    });
    await reloadRoles?.();
  };

  const handleDeleteRole = async (roleId: string) => {
    const currentRole = watch("role");
    const target = roles.find((r) => r.stylistRole_id === roleId);
    if (target && (target.role_name ?? "") === currentRole) {
      setValue("role", "", { shouldDirty: true, shouldTouch: true });
    }
    await deleteRole(roleId);
    await reloadRoles?.();
  };

  useLayoutEffect(() => {
    const updatePos = () => {
      if (!openServicesFor || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const estimated = { w: 288, h: popoverMaxHeight }; // 18rem wide
      const pos = computePopoverPosition(rect, estimated, 8);
      setPopoverStyle(pos);

      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const best = Math.max(
        160,
        Math.min(360, Math.max(spaceBelow, spaceAbove))
      );
      setPopoverMaxHeight(best);
    };

    updatePos();
    window.addEventListener("resize", updatePos, { passive: true });
    window.addEventListener("scroll", updatePos, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos);
    };
  }, [openServicesFor, popoverMaxHeight]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white/70 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Stylists</h2>
          <p className="text-xs text-gray-500">
            Manage team members, roles and service coverage
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
        >
          <Plus className="h-4 w-4" />
          Add Stylist
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
              <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Services</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {localStylists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10">
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-amber-50 grid place-items-center ring-1 ring-amber-100">
                        <Plus className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        No stylists yet
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Click “Add Stylist” to create your first team member.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                localStylists.map((stylist, i) => {
                  const rawList = Array.isArray(stylist.services)
                    ? stylist.services
                    : stylistServiceIdsByStylist[stylist.stylist_id] ?? [];
                  const resolvedNames = rawList.map((idOrName) =>
                    serviceById.has(idOrName)
                      ? serviceById.get(idOrName).name
                      : idOrName
                  );
                  const count = resolvedNames.filter(Boolean).length;

                  return (
                    <tr
                      key={stylist.stylist_id}
                      className={[
                        "transition-colors",
                        i % 2 === 0 ? "bg-white" : "bg-amber-50/30",
                        "hover:bg-amber-50/60",
                      ].join(" ")}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {stylist.name}
                        </div>
                        {stylist.phoneNumber && (
                          <div className="text-xs text-gray-500">
                            {stylist.phoneNumber}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="max-w-[280px] truncate text-gray-800">
                          {stylist.email || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <button
                          type="button"
                          ref={
                            openServicesFor === stylist.stylist_id
                              ? triggerRef
                              : null
                          }
                          onClick={(e) => {
                            triggerRef.current = e.currentTarget;
                            setOpenServicesFor((prev) =>
                              prev === stylist.stylist_id
                                ? null
                                : stylist.stylist_id
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          title={count ? "View services" : "No services"}
                        >
                          {count
                            ? `${count} service${count > 1 ? "s" : ""}`
                            : "—"}
                          <ChevronsUpDown size={14} className="opacity-70" />
                        </button>
                      </td>

                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                          {stylist.role || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(stylist.stylist_id)}
                            className="inline-flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            title="Edit"
                            aria-label={`Edit ${stylist.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(stylist.stylist_id)}
                            className="inline-flex items-center rounded-lg p-2 text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                            title="Delete"
                            aria-label={`Delete ${stylist.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Services Popover */}
      {openServicesFor && popoverStyle && (
        <PopoverPortal>
          <div
            style={{
              position: "fixed",
              top: popoverStyle.top,
              left: popoverStyle.left,
              width: 288, // 18rem
              maxHeight: popoverMaxHeight,
              overflowY: "auto",
              zIndex: 1000,
            }}
            className="rounded-xl border border-gray-100 bg-white/95 p-2 shadow-2xl backdrop-blur"
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-gray-800">
                Services
              </span>
              <button
                type="button"
                onClick={() => setOpenServicesFor(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close services popover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {(() => {
                const stylist =
                  localStylists.find((s) => s.stylist_id === openServicesFor) ||
                  null;
                const rawList = Array.isArray(stylist?.services)
                  ? stylist!.services!
                  : stylistServiceIdsByStylist[openServicesFor] ?? [];
                const resolvedNames = rawList.map((idOrName) =>
                  serviceById.has(idOrName)
                    ? serviceById.get(idOrName).name
                    : idOrName
                );
                if (resolvedNames.length === 0) {
                  return (
                    <li className="rounded-md px-2 py-2 text-sm text-gray-500">
                      No services assigned.
                    </li>
                  );
                }
                return resolvedNames.map((name, idx) => (
                  <li
                    key={`${openServicesFor}-${idx}`}
                    className="rounded-md px-2 py-2 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    {name || "-"}
                  </li>
                ));
              })()}
            </ul>
          </div>
        </PopoverPortal>
      )}

      {/* Add / Edit Stylist Modal */}
      {/* Add / Edit Stylist Modal */}
      {showModal && (
        <PopoverPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            {/* Overlay (full-page blur) */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeModal}
            />
            {/* Dialog */}
            <div className="relative z-10 w-full max-w-md mx-3">
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-white/90 backdrop-blur">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">
                      {modalType === "add" ? "Add Stylist" : "Edit Stylist"}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {modalType === "add"
                        ? "Fill in the details for the stylist."
                        : "Update the details for the stylist."}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5">
                      <path
                        d="M6 6l12 12M6 18L18 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">
                  {loadingDetail && modalType === "edit" ? (
                    <p className="text-sm text-gray-500">Fetching details…</p>
                  ) : detailError ? (
                    <p className="text-sm text-rose-600">{detailError}</p>
                  ) : null}

                  <form
                    key={`${formVersion}`}
                    className="mt-2 space-y-4"
                    onSubmit={handleSubmit(onSubmit)}
                  >
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-800">
                        Name
                      </label>
                      <input
                        {...register("name")}
                        className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        placeholder="Full name"
                      />
                      {errors.name && (
                        <p className="text-rose-600 text-xs">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-800">
                        Email
                      </label>
                      <input
                        {...register("email")}
                        className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        placeholder="name@domain.com"
                      />
                      {errors.email && (
                        <p className="text-rose-600 text-xs">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-800">
                        Phone Number
                      </label>
                      <input
                        {...register("phoneNumber")}
                        className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        placeholder="+63 9XX XXX XXXX"
                      />
                      {errors.phoneNumber && (
                        <p className="text-rose-600 text-xs">
                          {errors.phoneNumber.message}
                        </p>
                      )}
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-800">
                          Role
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRolesModal(true)}
                          className="text-xs font-semibold text-amber-700 hover:underline"
                        >
                          Manage roles
                        </button>
                      </div>
                      <select
                        className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        value={watch("role") || ""}
                        onChange={(e) =>
                          setValue("role", e.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                      >
                        <option value="" disabled>
                          Select a role…
                        </option>
                        {roles
                          .slice()
                          .sort((a, b) =>
                            (a.role_name ?? "").localeCompare(b.role_name ?? "")
                          )
                          .map((r) => (
                            <option
                              key={r.stylistRole_id}
                              value={r.role_name ?? ""}
                            >
                              {r.role_name}
                            </option>
                          ))}
                      </select>
                      {errors.role && (
                        <p className="text-rose-600 text-xs">
                          {errors.role.message}
                        </p>
                      )}
                    </div>

                    {/* Services */}
                    <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                      <div className="text-sm font-semibold text-gray-800">
                        Services
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {services.map((service: any) => {
                          const id = String(service.service_id);
                          const checked = (watch("services") ?? []).includes(
                            id
                          );
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-300"
                                value={id}
                                checked={checked}
                                onChange={(e) => {
                                  const set = new Set<string>(
                                    watch("services") ?? []
                                  );
                                  e.target.checked
                                    ? set.add(id)
                                    : set.delete(id);
                                  setValue("services", Array.from(set), {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                  });
                                }}
                              />
                              <span className="text-gray-800">
                                {service.name}{" "}
                                <span className="text-gray-500">
                                  — {service.duration} mins
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {errors.services && (
                        <p className="text-rose-600 text-xs">
                          {(errors.services as any).message}
                        </p>
                      )}
                    </div>

                    {/* Schedule */}
                    <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                      <div className="text-sm font-semibold text-gray-800">
                        Schedule
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ].map((day, index) => (
                          <div key={day} className="flex items-center gap-4">
                            <span className="w-24 text-sm text-gray-700">
                              {day}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                {...register(
                                  `schedule.${index}.start_time` as const
                                )}
                              />
                              <input
                                type="time"
                                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                {...register(
                                  `schedule.${index}.end_time` as const
                                )}
                              />
                              <input
                                type="hidden"
                                value={day}
                                {...register(`schedule.${index}.day` as const)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {errors.schedule && (
                        <p className="text-rose-600 text-xs">
                          Please check the schedule fields.
                        </p>
                      )}
                    </div>

                    <div className="h-2" />
                  </form>
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const container = (e.currentTarget.closest(
                        '[role="dialog"]'
                      ) ?? document) as HTMLElement;
                      const form = container.querySelector(
                        "form"
                      ) as HTMLFormElement | null;
                      form?.requestSubmit();
                    }}
                    className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PopoverPortal>
      )}

      {/* Manage Roles Modal */}
      {/* Manage Roles Modal */}
      {showRolesModal && (
        <PopoverPortal>
          <div className="fixed inset-0 z-[1001] flex items-center justify-center">
            {/* Overlay above everything, so it dims/blur the whole page */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowRolesModal(false)}
            />
            {/* Dialog */}
            <div className="relative z-10 w-full max-w-md mx-3">
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-white/90 backdrop-blur">
                  <h3 className="text-base sm:text-lg font-bold">
                    Manage Roles
                  </h3>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => setShowRolesModal(false)}
                    aria-label="Close roles"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5">
                      <path
                        d="M6 6l12 12M6 18L18 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex gap-2">
                    <input
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder="New role name (e.g., Senior Stylist)"
                    />
                    <button
                      type="button"
                      className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50"
                      onClick={handleAddNewRole}
                      disabled={!newRoleName.trim()}
                      title={
                        !newRoleName.trim() ? "Enter a role name" : "Add role"
                      }
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200">
                    {roles.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">No roles yet.</p>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {roles
                          .slice()
                          .sort((a, b) =>
                            (a.role_name ?? "").localeCompare(b.role_name ?? "")
                          )
                          .map((r) => (
                            <li
                              key={r.stylistRole_id}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <span className="text-sm text-gray-800">
                                {r.role_name}
                              </span>
                              <button
                                type="button"
                                className="text-rose-600 text-sm hover:underline"
                                onClick={() =>
                                  handleDeleteRole(r.stylistRole_id)
                                }
                                title="Delete role"
                              >
                                Delete
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 z-10 flex justify-end border-t border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
                  <button
                    type="button"
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={() => setShowRolesModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PopoverPortal>
      )}
    </section>
  );
};

export default AdminStylistSection;
