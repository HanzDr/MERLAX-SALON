// components/AdminStylistSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
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
  return m ? `${m[1]}:${m[2]}` : t.slice(0, 5);
};

const defaultSchedule: DaySchedule[] = DAYS.map((day) => ({
  day,
  start_time: "09:00",
  end_time: "17:00",
}));

const AdminStylistSection = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [selectedStylist, setSelectedStylist] = useState<Row | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0); // 👈 force remounts

  const {
    services,
    stylists,
    handleAddStylist,
    handleUpdateStylist,
    handleDeleteStylist,
    getStylistDetail,
  } = useServicesAndStylistContext();

  const [localStylists, setLocalStylists] = useState<Row[]>([]);

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

  // Controlled services selection
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

  const openAddModal = () => {
    setModalType("add");
    setSelectedStylist(null);
    setDetailError(null);
    // bump version to always remount fresh
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
    setFormVersion((v) => v + 1); // 👈 force brand-new form each open

    try {
      // MUST return fresh IDs from DB each time
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

      // reset with latest values from DB (controlled checkboxes read from watch)
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
          // update the row so the table reflects the latest service set
          setLocalStylists((prev) =>
            prev.map((s) =>
              s.stylist_id === selectedStylist.stylist_id
                ? {
                    ...s,
                    name: formData.name,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    role: formData.role,
                    services: res.serviceIds, // authoritative
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

  return (
    <div className="bg-gray-100 rounded-xl p-4 sm:p-6 overflow-x-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Stylists</h2>
        <button
          onClick={openAddModal}
          className="bg-[#FFB030] text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus size={18} /> Add Stylist
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-gray-400 text-left text-gray-600">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Services</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localStylists.map((stylist) => {
              const svc = Array.isArray(stylist.services)
                ? stylist.services
                    .map((idOrName) =>
                      serviceById.has(idOrName)
                        ? serviceById.get(idOrName).name
                        : idOrName
                    )
                    .join(", ")
                : "-";

              return (
                <tr
                  key={stylist.stylist_id}
                  className="border-b border-gray-200"
                >
                  <td className="py-4 pr-4">{stylist.name}</td>
                  <td className="py-4 pr-4">{stylist.email}</td>
                  <td className="py-4 pr-4">{svc || "-"}</td>
                  <td className="py-4 pr-4">{stylist.role || "-"}</td>
                  <td className="py-4 pr-4">
                    <div className="flex gap-4">
                      <button
                        aria-label="Edit"
                        onClick={() => openEditModal(stylist.stylist_id)}
                        className="text-gray-800"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        aria-label="Delete"
                        onClick={() => onDelete(stylist.stylist_id)}
                        className="text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {localStylists.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No stylists yet. Click “Add Stylist” to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md space-y-4 shadow-xl overflow-y-auto max-h-screen">
            <h2 className="text-xl sm:text-2xl font-bold">
              {modalType === "add" ? "Add Stylist" : "Edit Stylist"}
            </h2>
            <p className="text-gray-500">
              {modalType === "add"
                ? "Fill in the details for the stylist."
                : "Edit the details for the stylist."}
            </p>

            {loadingDetail && modalType === "edit" ? (
              <p className="text-sm text-gray-500">Fetching details…</p>
            ) : detailError ? (
              <p className="text-sm text-red-600">{detailError}</p>
            ) : null}

            <form
              key={`${formVersion}`} // 👈 guarantees a remount on each open
              className="space-y-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <input
                {...register("name")}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Name"
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}

              <input
                {...register("email")}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Email"
              />
              {errors.email && (
                <p className="text-red-600 text-sm">{errors.email.message}</p>
              )}

              <input
                {...register("phoneNumber")}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Phone Number"
              />
              {errors.phoneNumber && (
                <p className="text-red-600 text-sm">
                  {errors.phoneNumber.message}
                </p>
              )}

              <input
                {...register("role")}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Role"
              />
              {errors.role && (
                <p className="text-red-600 text-sm">{errors.role.message}</p>
              )}

              <div className="border border-gray-300 rounded-md p-2">
                <label className="font-semibold text-sm">Services</label>
                <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
                  {services.map((service: any) => {
                    const id = String(service.service_id);
                    const checked = selectedServiceIds.includes(id);
                    return (
                      <label key={id} className="block">
                        <input
                          type="checkbox"
                          value={id}
                          checked={checked}
                          onChange={(e) => toggleService(id, e.target.checked)}
                        />{" "}
                        {service.name} — {service.duration} minutes
                      </label>
                    );
                  })}
                </div>
                {errors.services && (
                  <p className="text-red-600 text-sm">
                    {(errors.services as any).message}
                  </p>
                )}
              </div>

              <div className="border border-gray-300 rounded-md p-2">
                <label className="font-semibold text-sm">Schedule</label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {DAYS.map((day, index) => (
                    <div key={day} className="flex items-center gap-4">
                      <span className="w-24 text-sm">{day}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          className="border rounded-md px-2 py-1"
                          {...register(`schedule.${index}.start_time` as const)}
                        />
                        <input
                          type="time"
                          className="border rounded-md px-2 py-1"
                          {...register(`schedule.${index}.end_time` as const)}
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
                  <p className="text-red-600 text-sm">
                    Please check the schedule fields.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-black text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#FFB030] text-white px-4 py-2 rounded-md"
                  disabled={modalType === "edit" && loadingDetail}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStylistSection;
