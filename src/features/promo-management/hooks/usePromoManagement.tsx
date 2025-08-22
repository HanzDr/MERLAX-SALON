// src/features/promo-management/hooks/usePromoManagement.ts
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import type { packageFormData } from "@/validation/PromoManagementSchema";

type CreateResult =
  | { success: true; packageId: string }
  | { success: false; message: string };

type UpdateResult = { success: true } | { success: false; message: string };
type DeleteResult = { success: true } | { success: false; message: string };

export type PackageRow = {
  package_id: string;
  name: string;
  status: "Active" | "Inactive";
  price: number;
  start_date: string;
  end_date: string;
  expected_duration?: number | null;
  included_services: string[];
  display?: boolean;
};

function isoDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

const usePromoManagement = () => {
  const [packages, setPackages] = useState<PackageRow[]>([]);

  const createPackage = useCallback(
    async (
      form: packageFormData,
      expectedDuration: number
    ): Promise<CreateResult> => {
      try {
        const serviceIds = Array.from(new Set(form.included_services));

        // Insert into Package (default display: true)
        const { data: pkg, error: pkgErr } = await supabase
          .from("Package")
          .insert({
            name: form.name,
            status: form.status,
            price: form.price,
            start_date: isoDate(form.start_date),
            end_date: isoDate(form.end_date),
            expected_duration: expectedDuration,
            display: true,
          })
          .select("package_id")
          .single();

        if (pkgErr) throw pkgErr;
        const packageId = (pkg as { package_id: string }).package_id;

        // Insert junction rows
        if (serviceIds.length) {
          const rows = serviceIds.map((service_id) => ({
            package_id: packageId,
            service_id,
          }));
          const { error: linkErr } = await supabase
            .from("PackageServices")
            .insert(rows);
          if (linkErr) {
            await supabase.from("Package").delete().eq("package_id", packageId);
            throw linkErr;
          }
        }

        return { success: true, packageId };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : JSON.stringify(err);
        return { success: false, message };
      }
    },
    []
  );

  const updatePackage = useCallback(
    async (
      packageId: string,
      form: packageFormData,
      expectedDuration: number
    ): Promise<UpdateResult> => {
      try {
        const serviceIds = Array.from(new Set(form.included_services));

        // Update Package
        const { error: pkgErr } = await supabase
          .from("Package")
          .update({
            name: form.name,
            status: form.status,
            price: form.price,
            start_date: isoDate(form.start_date),
            end_date: isoDate(form.end_date),
            expected_duration: expectedDuration,
          })
          .eq("package_id", packageId);
        if (pkgErr) throw pkgErr;

        // Replace relations
        const { error: delErr } = await supabase
          .from("PackageServices")
          .delete()
          .eq("package_id", packageId);
        if (delErr) throw delErr;

        if (serviceIds.length) {
          const rows = serviceIds.map((service_id) => ({
            package_id: packageId,
            service_id,
          }));
          const { error: insErr } = await supabase
            .from("PackageServices")
            .insert(rows);
          if (insErr) throw insErr;
        }

        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : JSON.stringify(err);
        return { success: false, message };
      }
    },
    []
  );

  const fetchPackages = useCallback(async () => {
    try {
      // Only fetch packages where display === true
      const { data: pkgRows, error: pkgErr } = await supabase
        .from("Package")
        .select("*")
        .eq("display", true);
      if (pkgErr) throw pkgErr;

      const { data: svcRows, error: svcErr } = await supabase
        .from("PackageServices")
        .select("package_id, service_id");
      if (svcErr) throw svcErr;

      const servicesMap = new Map<string, string[]>();
      (svcRows ?? []).forEach((row) => {
        if (!servicesMap.has(row.package_id))
          servicesMap.set(row.package_id, []);
        servicesMap.get(row.package_id)!.push(row.service_id);
      });

      const merged: PackageRow[] = (pkgRows ?? []).map((p) => ({
        package_id: p.package_id,
        name: p.name,
        status: p.status,
        price: p.price,
        start_date: p.start_date,
        end_date: p.end_date,
        expected_duration:
          typeof p.expected_duration === "number"
            ? p.expected_duration
            : Number(p.expected_duration ?? 0) || 0,
        included_services: Array.from(
          new Set(servicesMap.get(p.package_id) ?? [])
        ),
        display: p.display,
      }));

      setPackages(merged);
      return { success: true, data: merged } as const;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);
      return { success: false, message } as const;
    }
  }, []);

  const deletePackage = useCallback(
    async (packageId: string): Promise<DeleteResult> => {
      try {
        // 1) Remove all junction rows for this package
        const { error: svcDelErr } = await supabase
          .from("PackageServices")
          .delete()
          .eq("package_id", packageId);
        if (svcDelErr) throw svcDelErr;

        // 2) Soft delete package (display=false)
        const { error: pkgUpdErr } = await supabase
          .from("Package")
          .update({ display: false })
          .eq("package_id", packageId);
        if (pkgUpdErr) throw pkgUpdErr;

        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : JSON.stringify(err);
        return { success: false, message };
      }
    },
    []
  );

  return {
    packages,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
  };
};

export default usePromoManagement;
