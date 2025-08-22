// hooks/useServicesAndStylists.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { type Service, type Stylist } from "../types/ServiceAndStylistTypes";
import {
  type serviceSchemaData,
  type stylistSchemaData,
} from "@/validation/ServicesAndStylistSchema";

import { type DaySchedule } from "../types/ServiceAndStylistTypes";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const dayOrder = new Map(DAYS.map((d, i) => [d, i]));
const sortByDay = <T extends { day: string }>(rows: T[]) =>
  [...rows].sort(
    (a, b) => (dayOrder.get(a.day) ?? 0) - (dayOrder.get(b.day) ?? 0)
  );

const useServicesAndStylists = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lightweight: Services + Stylists only
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [servicesRes, stylistsRes] = await Promise.all([
          supabase.from("Services").select("*").eq("display", true),
          supabase.from("Stylists").select("*").eq("display", true),
        ]);

        if (servicesRes.error) setError("Failed to fetch services");
        else setServices(servicesRes.data || []);

        if (stylistsRes.error) setError("Failed to fetch stylists");
        else setStylists(stylistsRes.data || []);
      } catch {
        setError("Unexpected error while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Lazy detail loader for Edit
  const getStylistDetail = async (stylistId: string) => {
    const { data: stylist, error: stylistErr } = await supabase
      .from("Stylists")
      .select("*")
      .eq("stylist_id", stylistId)
      .single();
    if (stylistErr) throw stylistErr;

    const { data: scheduleRows, error: schedErr } = await supabase
      .from("StylistSchedules")
      .select("day_of_week, start_time, end_time")
      .eq("stylist_id", stylistId);
    if (schedErr) throw schedErr;

    const schedule: DaySchedule[] = sortByDay(
      (scheduleRows || []).map((r) => ({
        day: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      }))
    );

    const { data: svcRows, error: svcErr } = await supabase
      .from("StylistServices")
      .select("service_id")
      .eq("stylist_id", stylistId);
    if (svcErr) throw svcErr;

    const serviceIds = (svcRows || []).map((r) => r.service_id as string);
    return { stylist, schedule, serviceIds };
  };

  // ——— Service ops ———
  const handleAddService = async (
    formData: serviceSchemaData,
    reset: () => void
  ) => {
    const { error, data } = await supabase
      .from("Services")
      .insert([
        {
          name: formData.name,
          description: formData.description,
          duration: formData.duration,
          min_price: formData.min_price,
          max_price: formData.max_price,
          display: true,
        },
      ])
      .select();

    if (error) {
      return { success: false, message: "Error inserting into Services table" };
    }

    reset();
    setServices((prev) => [...prev, data![0] as Service]);
    return { success: true, message: "Service added successfully" };
  };

  const handleUpdateService = async (
    updateForm: Service,
    reset: () => void
  ) => {
    const { error } = await supabase
      .from("Services")
      .update({
        name: updateForm.name,
        description: updateForm.description,
        duration: updateForm.duration,
        min_price: updateForm.min_price,
        max_price: updateForm.max_price,
      })
      .eq("service_id", updateForm.service_id);

    if (error) return false;

    reset();
    setServices((prev) =>
      prev.map((s) => (s.service_id === updateForm.service_id ? updateForm : s))
    );
    return true;
  };

  const handleRemoveService = async (serviceId: string) => {
    const { error } = await supabase
      .from("Services")
      .update({ display: false })
      .eq("service_id", serviceId);

    if (error) return false;

    setServices((prev) =>
      prev
        .map((s) => (s.service_id === serviceId ? { ...s, display: false } : s))
        .filter((s) => s.display)
    );
    return true;
  };

  // ——— Stylist ops ———
  // Return the created row so component can use the real ID safely
  const handleAddStylist = async (
    formData: stylistSchemaData,
    reset: () => void
  ): Promise<
    { success: true; stylist: Stylist } | { success: false; message: string }
  > => {
    const { data: stylistData, error: stylistError } = await supabase
      .from("Stylists")
      .insert({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        display: true,
      })
      .select("*")
      .single();

    if (stylistError || !stylistData) {
      console.error("Error inserting stylist:", stylistError);
      return { success: false, message: "Failed to create stylist" };
    }

    const stylistId = stylistData.stylist_id as string;

    if (formData.schedule?.length) {
      const scheduleRows = formData.schedule.map((s) => ({
        stylist_id: stylistId,
        day_of_week: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
      }));
      const { error: scheduleError } = await supabase
        .from("StylistSchedules")
        .insert(scheduleRows);
      if (scheduleError) {
        console.error("Error inserting schedule:", scheduleError);
        return { success: false, message: "Failed to add schedule" };
      }
    }

    if (formData.services?.length) {
      const serviceRows = formData.services.map((serviceId) => ({
        stylist_id: stylistId,
        service_id: serviceId,
      }));
      const { error: serviceError } = await supabase
        .from("StylistServices")
        .insert(serviceRows);
      if (serviceError) {
        console.error("Error inserting services:", serviceError);
        return { success: false, message: "Failed to add services" };
      }
    }

    // keep main list in sync
    setStylists((prev) => [...prev, stylistData as Stylist]);
    reset();

    return { success: true, stylist: stylistData as Stylist };
  };

  const handleDeleteStylist = async (id: string) => {
    const { error } = await supabase
      .from("Stylists")
      .update({ display: false })
      .eq("stylist_id", id);

    if (error) {
      console.error("Failed to soft-delete stylist:", error);
      throw error;
    }
    setStylists((prev) => prev.filter((s) => s.stylist_id !== id));
  };

  const handleUpdateStylist = async (
    stylistId: string,
    updateForm: stylistSchemaData,
    reset: () => void
  ): Promise<
    | { success: true; serviceIds: string[] }
    | { success: false; message: string }
  > => {
    try {
      // 0) Normalize incoming values to KNOWN service IDs
      const serviceNameToId = new Map<string, string>();
      const validServiceIds = new Set<string>();
      services.forEach((s: any) => {
        serviceNameToId.set(String(s.name).trim(), s.service_id);
        validServiceIds.add(String(s.service_id));
      });

      const nextIds: string[] = (updateForm.services ?? [])
        .map((v) => {
          const raw = String(v).trim();
          if (validServiceIds.has(raw)) return raw; // already an ID
          const byName = serviceNameToId.get(raw); // maybe it's a name
          return byName ?? raw;
        })
        .filter((id) => validServiceIds.has(id)); // keep only valid IDs

      // 1) Update basic info
      const { error: stylistErr } = await supabase
        .from("Stylists")
        .update({
          name: updateForm.name,
          email: updateForm.email,
          phoneNumber: updateForm.phoneNumber,
          role: updateForm.role,
        })
        .eq("stylist_id", stylistId);
      if (stylistErr) throw stylistErr;

      // 2) Replace schedules (delete all -> insert)
      const { error: delSchedErr } = await supabase
        .from("StylistSchedules")
        .delete()
        .eq("stylist_id", stylistId);
      if (delSchedErr) throw delSchedErr;

      if (updateForm.schedule?.length) {
        const scheduleRows = updateForm.schedule.map((s) => ({
          stylist_id: stylistId,
          day_of_week: s.day,
          start_time: s.start_time, // "HH:MM"
          end_time: s.end_time,
        }));
        const { error: insSchedErr } = await supabase
          .from("StylistSchedules")
          .insert(scheduleRows);
        if (insSchedErr) throw insSchedErr;
      }

      // 3) Replace services (delete ALL for stylist, then insert nextIds)
      //    This avoids edge cases with filters not matching.
      const { error: delAllSvcErr } = await supabase
        .from("StylistServices")
        .delete()
        .eq("stylist_id", stylistId);
      if (delAllSvcErr)
        throw new Error("Error in deleting services: " + delAllSvcErr.message);

      if (nextIds.length) {
        const rows = nextIds.map((service_id) => ({
          stylist_id: stylistId,
          service_id,
        }));
        const { error: insSvcErr } = await supabase
          .from("StylistServices")
          .insert(rows);
        if (insSvcErr) throw insSvcErr;
      }

      // 4) reflect basic info locally
      setStylists((prev) =>
        prev.map((s) =>
          s.stylist_id === stylistId
            ? {
                ...s,
                name: updateForm.name,
                email: updateForm.email,
                phoneNumber: updateForm.phoneNumber,
                role: updateForm.role,
              }
            : s
        )
      );

      reset();
      return { success: true, serviceIds: nextIds };
    } catch (err) {
      console.error("handleUpdateStylist failed:", err);
      return { success: false, message: "Update failed" };
    }
  };

  return {
    services,
    stylists,
    loading,
    error,
    // service ops
    handleAddService,
    handleUpdateService,
    handleRemoveService,
    // stylist ops
    handleAddStylist,
    handleDeleteStylist,
    handleUpdateStylist,
    // details
    getStylistDetail,
  };
};

export default useServicesAndStylists;
