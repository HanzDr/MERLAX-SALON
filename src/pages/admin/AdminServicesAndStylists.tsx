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
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setActiveTab("service")}
          className={`px-4 py-2 rounded-md font-medium transition ${
            activeTab === "service"
              ? "bg-[#FFB030] text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Service
        </button>
        <button
          onClick={() => setActiveTab("stylist")}
          className={`px-4 py-2 rounded-md font-medium transition ${
            activeTab === "stylist"
              ? "bg-[#FFB030] text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Stylist
        </button>
      </div>

      {/* Service Tab Content */}
      {activeTab === "service" && (
        <div className="bg-gray-100 rounded-xl p-4 sm:p-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Services</h2>
            <button
              onClick={openAddModal}
              className="bg-[#FFB030] text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus size={18} /> Add Service
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-400 text-left text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Duration (Minutes)</th>
                  <th className="py-2 pr-4">Min Price</th>
                  <th className="py-2 pr-4">Max Price</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.service_id}
                    className="border-b border-gray-200"
                  >
                    <td className="py-4 pr-4">{service.name}</td>
                    <td className="py-4 pr-4">{service.duration}</td>
                    <td className="py-4 pr-4">₱ {service.min_price}</td>
                    <td className="py-4 pr-4">₱ {service.max_price}</td>
                    <td className="py-4 pr-4">
                      <div className="flex gap-4">
                        <Pencil
                          size={18}
                          className="cursor-pointer text-gray-800"
                          onClick={() => openEditModal(service)}
                        />
                        <Trash2
                          size={18}
                          className="cursor-pointer text-red-600"
                          onClick={() => handleRemove(service.service_id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stylist Tab Content */}
      {activeTab === "stylist" && <AdminStylistSection />}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold">
              {modalType === "add" ? "Add Service" : "Edit Service"}
            </h2>
            <p className="text-gray-500">
              {modalType === "add"
                ? "Fill in the details for the Service."
                : "Edit the details for the Service."}
            </p>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {fields.map((field) => (
                <div key={field} className="space-y-1">
                  <label
                    htmlFor={field}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {field === "min_price"
                      ? " Min Price (₱)"
                      : field === "duration"
                      ? "Duration (minutes)"
                      : field === "max_price"
                      ? "Max Price (₱)"
                      : field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>

                  <input
                    id={field}
                    {...register(field)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                    <p className="text-red-500 text-sm mt-1">
                      {errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}

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

export default AdminServicesAndStylists;
