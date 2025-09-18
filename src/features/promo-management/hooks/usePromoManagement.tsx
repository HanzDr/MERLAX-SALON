// src/features/promo-management/hooks/usePromoManagement.ts
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import type { packageFormData } from "@/validation/PromoManagementSchema";

/* ---------------------------- Packages (existing) ---------------------------- */

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

function isoDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Date(dt).toISOString().slice(0, 10);
}

/* ---------------------------- Discounts (new) ---------------------------- */

type DiscountType = "Fixed" | "Percentage";
type AppliesTo = "Service" | "Package";

export type DiscountFormData = {
  name: string;
  type: DiscountType; // "Fixed" | "Percentage"
  value: number; // fixed = PHP; percentage = %
  applies_to: AppliesTo; // "Service" | "Package"
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  amount_of_uses?: number | null;
  status: "Active" | "Inactive";
  /**
   * For applies_to === "Service", put service IDs here.
   * For applies_to === "Package", put package IDs here.
   */
  included_services: string[];
};

export type DiscountRow = {
  discount_id: string;
  name: string;
  type: DiscountType;
  value: number;
  applies_to: AppliesTo;
  start_date: string | null;
  end_date: string | null;
  amount_of_uses: number | null;
  status: "Active" | "Inactive";
  included_services: string[]; // service IDs or package IDs depending on applies_to
  display?: boolean | null;
};

type CreateDiscountResult =
  | { success: true; discountId: string }
  | { success: false; message: string };

type FetchDiscountsResult =
  | { success: true; data: DiscountRow[] }
  | { success: false; message: string };

const usePromoManagement = () => {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);

  /* ------------------------- Package CRUD (existing) ------------------------- */

  const createPackage = useCallback(
    async (
      form: packageFormData,
      expectedDuration: number
    ): Promise<CreateResult> => {
      try {
        const serviceIds = Array.from(new Set(form.included_services));

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

      const merged: PackageRow[] = (pkgRows ?? []).map((p: any) => ({
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
        const { error: svcDelErr } = await supabase
          .from("PackageServices")
          .delete()
          .eq("package_id", packageId);
        if (svcDelErr) throw svcDelErr;

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

  /* ----------------------------- Discounts API ----------------------------- */

  const addDiscount = useCallback(
    async (form: DiscountFormData): Promise<CreateDiscountResult> => {
      try {
        const targetIds = Array.from(new Set(form.included_services ?? []));

        // 1) Insert Discounts (assumes a `display` column exists; default true)
        const { data: disc, error: discErr } = await supabase
          .from("Discounts")
          .insert({
            name: form.name,
            type: form.type,
            value: form.value,
            applies_to: form.applies_to,
            start_date:
              form.start_date == null ? null : isoDate(form.start_date),
            end_date: form.end_date == null ? null : isoDate(form.end_date),
            amount_of_uses:
              form.amount_of_uses == null ? null : form.amount_of_uses,
            status: form.status,
            display: true,
          })
          .select("discount_id")
          .single();

        if (discErr) throw discErr;
        const discountId = (disc as { discount_id: string }).discount_id;

        // 2) Insert DiscountServices
        if (targetIds.length) {
          const rows =
            form.applies_to === "Service"
              ? targetIds.map((service_id) => ({
                  discount_Id: discountId, // keep your original casing if that's the column name
                  service_id,
                  package_id: null,
                }))
              : targetIds.map((package_id) => ({
                  discount_Id: discountId,
                  service_id: null,
                  package_id,
                }));

          const { error: linkErr } = await supabase
            .from("DiscountServices")
            .insert(rows);

          if (linkErr) {
            await supabase
              .from("Discounts")
              .delete()
              .eq("discount_id", discountId);
            throw linkErr;
          }
        }

        return { success: true, discountId };
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

  /** Fetch discounts where display === true and hydrate included_services */
  const fetchDiscounts =
    useCallback(async (): Promise<FetchDiscountsResult> => {
      try {
        const { data: discRows, error: discErr } = await supabase
          .from("Discounts")
          .select("*")
          .eq("display", true);
        if (discErr) throw discErr;

        const { data: linkRows, error: linkErr } = await supabase
          .from("DiscountServices")
          .select("discount_Id, service_id, package_id");
        if (linkErr) throw linkErr;

        // group links by discount_Id
        const linkMap = new Map<
          string,
          Array<{ service_id: string | null; package_id: string | null }>
        >();
        (linkRows ?? []).forEach((r: any) => {
          const key = String(r.discount_Id);
          if (!linkMap.has(key)) linkMap.set(key, []);
          linkMap.get(key)!.push({
            service_id: r.service_id ?? null,
            package_id: r.package_id ?? null,
          });
        });

        const merged: DiscountRow[] = (discRows ?? []).map((d: any) => {
          const links = linkMap.get(String(d.discount_id)) ?? [];
          const ids =
            d.applies_to === "Service"
              ? (links
                  .map((l) => (l.service_id ? String(l.service_id) : null))
                  .filter(Boolean) as string[])
              : (links
                  .map((l) => (l.package_id ? String(l.package_id) : null))
                  .filter(Boolean) as string[]);

          return {
            discount_id: String(d.discount_id),
            name: String(d.name),
            type: d.type as DiscountType,
            value: Number(d.value),
            applies_to: d.applies_to as AppliesTo,
            start_date: d.start_date ? String(d.start_date) : null,
            end_date: d.end_date ? String(d.end_date) : null,
            amount_of_uses:
              d.amount_of_uses == null ? null : Number(d.amount_of_uses),
            status: d.status as "Active" | "Inactive",
            included_services: Array.from(new Set(ids)),
            display: d.display ?? true,
          };
        });

        setDiscounts(merged);
        return { success: true, data: merged };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : JSON.stringify(err);
        return { success: false, message };
      }
    }, []);

  /** Soft delete discount: update display=false */
  const deleteDiscount = useCallback(
    async (discountId: string): Promise<DeleteResult> => {
      try {
        const { error } = await supabase
          .from("Discounts")
          .update({ display: false })
          .eq("discount_id", discountId);
        if (error) throw error;

        // optional: update local state
        setDiscounts((prev) =>
          prev.filter((d) => d.discount_id !== discountId)
        );

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
    // packages API
    packages,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,

    // discounts API
    discounts,
    fetchDiscounts,
    addDiscount,
    deleteDiscount, // "update" == soft-delete by setting display=false
  };
};

export default usePromoManagement;
