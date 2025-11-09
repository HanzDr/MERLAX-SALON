// hooks/useServicesAndStylists.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import {
  type Service,
  type Stylist,
  type DaySchedule,
} from "../types/ServiceAndStylistTypes";
import {
  type serviceSchemaData,
  type stylistSchemaData,
} from "@/validation/ServicesAndStylistSchema";

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

// Role type
export type StylistRoleRow = {
  stylistRole_id: string;
  role_name: string | null;
  created_at?: string;
  display: boolean | null;
};

const useServicesAndStylists = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [roles, setRoles] = useState<StylistRoleRow[]>([]);
  // NEW: map of stylist_id -> array of service_ids
  const [stylistServiceIdsByStylist, setStylistServiceIdsByStylist] = useState<
    Record<string, string[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lightweight: Services + Stylists + Roles (+ StylistServices map)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [servicesRes, stylistsRes, rolesRes] = await Promise.all([
          supabase.from("Services").select("*").eq("display", true),
          supabase.from("Stylists").select("*").eq("display", true),
          supabase.from("StylistRole").select("*").eq("display", true),
        ]);

        if (servicesRes.error) setError("Failed to fetch services");
        else setServices(servicesRes.data || []);

        if (stylistsRes.error) setError("Failed to fetch stylists");
        else setStylists(stylistsRes.data || []);

        if (rolesRes.error) setError("Failed to fetch roles");
        else setRoles((rolesRes.data || []) as StylistRoleRow[]);

        // After we know stylist IDs, fetch StylistServices and group by stylist_id
        const stylistIds: string[] = (stylistsRes.data || []).map(
          (s: any) => s.stylist_id
        );
        if (stylistIds.length) {
          const { data: svcLinks, error: svcLinksErr } = await supabase
            .from("StylistServices")
            .select("stylist_id, service_id")
            .in("stylist_id", stylistIds);

          if (!svcLinksErr && svcLinks) {
            const grouped: Record<string, string[]> = {};
            for (const row of svcLinks as Array<{
              stylist_id: string;
              service_id: string;
            }>) {
              if (!grouped[row.stylist_id]) grouped[row.stylist_id] = [];
              grouped[row.stylist_id].push(String(row.service_id));
            }
            setStylistServiceIdsByStylist(grouped);
          }
        } else {
          setStylistServiceIdsByStylist({});
        }
      } catch (e) {
        console.error(e);
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

  // ——— Role ops ———
  const addRole = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, message: "Role name is required." };

    const { data, error } = await supabase
      .from("StylistRole")
      .insert({ role_name: trimmed, display: true })
      .select("*")
      .single();

    if (error || !data) {
      console.error(error);
      return { success: false, message: "Failed to create role." };
    }
    setRoles((prev) => [...prev, data as StylistRoleRow]);
    return { success: true, role: data as StylistRoleRow };
  };

  const deleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from("StylistRole")
      .update({ display: false })
      .eq("stylistRole_id", roleId);

    if (error) {
      console.error(error);
      return { success: false, message: "Failed to delete role." };
    }
    setRoles((prev) => prev.filter((r) => r.stylistRole_id !== roleId));
    return { success: true };
  };

  const reloadRoles = async () => {
    const { data, error } = await supabase
      .from("StylistRole")
      .select("*")
      .eq("display", true)
      .order("role_name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    setRoles((data || []) as StylistRoleRow[]);
  };

  // ——— Stylist ops ———
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
      // keep the map in sync for the new stylist
      setStylistServiceIdsByStylist((prev) => ({
        ...prev,
        [stylistId]: [...(prev[stylistId] ?? []), ...formData.services!],
      }));
    }

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
    // also clean map
    setStylistServiceIdsByStylist((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      // normalize to service IDs
      const serviceNameToId = new Map<string, string>();
      const validServiceIds = new Set<string>();
      services.forEach((s: any) => {
        serviceNameToId.set(String(s.name).trim(), s.service_id);
        validServiceIds.add(String(s.service_id));
      });

      const nextIds: string[] = (updateForm.services ?? [])
        .map((v) => {
          const raw = String(v).trim();
          if (validServiceIds.has(raw)) return raw;
          const byName = serviceNameToId.get(raw);
          return byName ?? raw;
        })
        .filter((id) => validServiceIds.has(id));

      // 1) basic info
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

      // 2) schedules
      const { error: delSchedErr } = await supabase
        .from("StylistSchedules")
        .delete()
        .eq("stylist_id", stylistId);
      if (delSchedErr) throw delSchedErr;

      if (updateForm.schedule?.length) {
        const scheduleRows = updateForm.schedule.map((s) => ({
          stylist_id: stylistId,
          day_of_week: s.day,
          start_time: s.start_time,
          end_time: s.end_time,
        }));
        const { error: insSchedErr } = await supabase
          .from("StylistSchedules")
          .insert(scheduleRows);
        if (insSchedErr) throw insSchedErr;
      }

      // 3) services replace
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

      // reflect locally
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
      setStylistServiceIdsByStylist((prev) => ({
        ...prev,
        [stylistId]: nextIds,
      }));

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
    roles,
    stylistServiceIdsByStylist, // NEW: expose the map
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
    // role ops
    addRole,
    deleteRole,
    reloadRoles,
    // details
    getStylistDetail,
  };
};

export default useServicesAndStylists;
