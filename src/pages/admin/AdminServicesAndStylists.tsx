import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Trash2, Plus } from "lucide-react";
import AdminStylistSection from "./AdminStylistSection";
import type { Service } from "@/features/servicesAndStylist/types/ServiceAndStylistTypes";
import { useServicesAndStylistContext } from "@/features/servicesAndStylist/contexts/ServicesAndStylistContext";
import {
  serviceSchema,
  type serviceSchemaData,
} from "@/validation/ServicesAndStylistSchema";
import { zodResolver } from "@hookform/resolvers/zod";

/* ---------- tiny helpers (UI only) ---------- */
const peso = (v?: number | null) =>
  v == null || Number.isNaN(Number(v))
    ? "—"
    : `₱${Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;

const AdminServicesAndStylists = () => {
  const [activeTab, setActiveTab] = useState<"service" | "stylist">("service");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null
  );

  const {
    handleAddService,
    handleUpdateService,
    handleRemoveService,
    services,
  } = useServicesAndStylistContext();

  const fields = [
    "name",
    "description",
    "duration",
    "min_price",
    "max_price",
  ] as const;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<serviceSchemaData>({ resolver: zodResolver(serviceSchema) });

  const openAddModal = () => {
    setModalType("add");
    reset({
      name: "",
      description: "",
      duration: 0,
      min_price: 0,
      max_price: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (service: Service) => {
    setModalType("edit");
    setSelectedServiceId(service.service_id);
    reset({
      name: service.name,
      description: service.description,
      duration: service.duration,
      min_price: service.min_price,
      max_price: service.max_price,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    reset();
    setSelectedServiceId(null);
  };

  const onSubmit = async (formData: serviceSchemaData) => {
    try {
      if (modalType === "add") {
        await handleAddService(formData, reset);
      } else if (modalType === "edit" && selectedServiceId !== null) {
        const updatePayload = {
          ...formData,
          service_id: selectedServiceId,
          display: true,
        };
        await handleUpdateService(updatePayload, reset);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (serviceId: string) => {
    try {
      await handleRemoveService(serviceId);
    } catch (err: any) {
      const message =
        err?.message || "An error occurred while removing the service";
      console.error(message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-center pt-4 sm:text-left">
        Services and Stylists
      </h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("service")}
          className={[
            "relative rounded-full px-4 py-2 text-sm font-semibold transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
            activeTab === "service"
              ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200",
          ].join(" ")}
        >
          Service
        </button>
        <button
          onClick={() => setActiveTab("stylist")}
          className={[
            "relative rounded-full px-4 py-2 text-sm font-semibold transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
            activeTab === "stylist"
              ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200",
          ].join(" ")}
        >
          Stylist
        </button>
      </div>

      {/* Service Tab */}
      {activeTab === "service" && (
        <section className="rounded-2xl border border-gray-100 bg-white/70 shadow-sm backdrop-blur-sm">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Services</h2>
              <p className="text-xs text-gray-500">
                Manage your services, pricing and durations
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          </div>

          {/* Table Wrapper with sticky header */}
          <div className="overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full text-left">
                <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
                  <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Duration (min)</th>
                    <th className="px-5 py-3 font-semibold">Min Price</th>
                    <th className="px-5 py-3 font-semibold">Max Price</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10">
                        <div className="text-center">
                          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-amber-50 grid place-items-center ring-1 ring-amber-100">
                            <Plus className="h-5 w-5 text-amber-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-800">
                            No services yet
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Click “Add Service” to create your first one.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    services.map((service, i) => (
                      <tr
                        key={service.service_id}
                        className={[
                          "transition-colors",
                          i % 2 === 0 ? "bg-white" : "bg-amber-50/30",
                          "hover:bg-amber-50/60",
                        ].join(" ")}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {service.description}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3 text-gray-800">
                          {service.duration ?? "—"}
                        </td>

                        <td className="px-5 py-3 text-gray-900">
                          {peso(service.min_price)}
                        </td>

                        <td className="px-5 py-3 text-gray-900">
                          {peso(service.max_price)}
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(service)}
                              className="inline-flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                              title="Edit"
                              aria-label={`Edit ${service.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(service.service_id)}
                              className="inline-flex items-center rounded-lg p-2 text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                              title="Delete"
                              aria-label={`Delete ${service.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Stylist Tab */}
      {activeTab === "stylist" && <AdminStylistSection />}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-md mx-3">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl p-5">
              <h2
                id="service-modal-title"
                className="text-xl sm:text-2xl font-bold"
              >
                {modalType === "add" ? "Add Service" : "Edit Service"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {modalType === "add"
                  ? "Fill in the details for the service."
                  : "Update the details for the service."}
              </p>

              <form
                className="mt-4 space-y-4"
                onSubmit={handleSubmit(onSubmit)}
              >
                {fields.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label
                      htmlFor={field}
                      className="block text-sm font-semibold text-gray-800"
                    >
                      {field === "min_price"
                        ? "Min Price (₱)"
                        : field === "duration"
                        ? "Duration (minutes)"
                        : field === "max_price"
                        ? "Max Price (₱)"
                        : field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>

                    <input
                      id={field}
                      {...register(field)}
                      className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder={
                        field === "min_price"
                          ? "Min Price (₱)"
                          : field === "duration"
                          ? "Duration (minutes)"
                          : field === "max_price"
                          ? "Max Price (₱)"
                          : field.charAt(0).toUpperCase() + field.slice(1)
                      }
                    />

                    {errors[field] && (
                      <p className="text-rose-600 text-xs">
                        {errors[field]?.message as string}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServicesAndStylists;
