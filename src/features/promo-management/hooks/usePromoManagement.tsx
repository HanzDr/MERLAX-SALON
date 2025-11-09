import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import type { packageFormData } from "@/validation/PromoManagementSchema";
import type {
  CreateResult,
  UpdateResult,
  DeleteResult,
  PackageRow,
  DiscountType,
  AppliesTo,
  DiscountFormData,
  DiscountRow,
  CreateDiscountResult,
  FetchDiscountsResult,
} from "../types/PromoManagementTypes";

/* ------------------------- Helpers ------------------------- */

function isoDate(d: Date | string | null | undefined) {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Date(dt).toISOString().slice(0, 10);
}
const toStr = (v: unknown) => (v == null ? "" : String(v));

/* Dedup + stringify IDs */
function normIds(ids?: unknown[]): string[] {
  return Array.from(
    new Set((ids ?? []).map((x) => toStr(x).trim()).filter(Boolean))
  );
}

const usePromoManagement = () => {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);

  /* ------------------------- PACKAGE CRUD ------------------------- */

  const createPackage = useCallback(
    async (
      form: packageFormData,
      expectedDuration: number
    ): Promise<CreateResult> => {
      try {
        const serviceIds = normIds(form.included_services);

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
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
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
        const serviceIds = normIds(form.included_services);

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
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
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
        const k = toStr(row.package_id);
        const v = toStr(row.service_id);
        if (!k || !v) return;
        if (!servicesMap.has(k)) servicesMap.set(k, []);
        servicesMap.get(k)!.push(v);
      });

      const merged: PackageRow[] = (pkgRows ?? []).map((p: any) => ({
        package_id: toStr(p.package_id),
        name: toStr(p.name),
        status: p.status,
        price: p.price,
        start_date: p.start_date,
        end_date: p.end_date,
        expected_duration: Number(p.expected_duration ?? 0),
        included_services: Array.from(
          new Set(servicesMap.get(toStr(p.package_id)) ?? [])
        ),
        display: p.display,
      }));

      setPackages(merged);
      return { success: true, data: merged } as const;
    } catch (err: any) {
      return { success: false, message: err?.message ?? String(err) } as const;
    }
  }, []);

  const deletePackage = useCallback(
    async (packageId: string): Promise<DeleteResult> => {
      try {
        await supabase
          .from("PackageServices")
          .delete()
          .eq("package_id", packageId);
        await supabase
          .from("Package")
          .update({ display: false })
          .eq("package_id", packageId);
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
      }
    },
    []
  );

  /* ----------------------------- DISCOUNTS API ----------------------------- */

  const addDiscount = useCallback(
    async (form: DiscountFormData): Promise<CreateDiscountResult> => {
      try {
        const targetIds = normIds(form.included_services);
        const amountOfUses: number | null =
          (form as any).amount_of_uses ?? (form as any).uses ?? null;

        const { data: disc, error: discErr } = await supabase
          .from("Discounts")
          .insert({
            name: form.name,
            type: form.type, // "Fixed" | "Percentage"
            value: form.value,
            applies_to: form.applies_to as AppliesTo, // "Service" | "Package"
            start_date: isoDate(form.start_date),
            end_date: isoDate(form.end_date),
            amount_of_uses: amountOfUses,
            status: form.status,
            display: true,
          })
          .select("discount_id")
          .single();
        if (discErr) throw discErr;

        const discountId = toStr((disc as any).discount_id);

        if (targetIds.length) {
          const rows =
            form.applies_to === "Service"
              ? targetIds.map((service_id) => ({
                  discount_id: discountId,
                  service_id,
                  package_id: null,
                }))
              : targetIds.map((package_id) => ({
                  discount_id: discountId,
                  service_id: null,
                  package_id,
                }));

          const { error: linkErr } = await supabase
            .from("DiscountServices")
            .insert(rows);
          if (linkErr) throw linkErr;
        }

        return { success: true, discountId };
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
      }
    },
    []
  );

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
          .select("discount_id, service_id, package_id");
        if (linkErr) throw linkErr;

        const linkMap = new Map<
          string,
          Array<{ service_id: string | null; package_id: string | null }>
        >();
        (linkRows ?? []).forEach((r: any) => {
          const key = toStr(r.discount_id);
          if (!key) return;
          if (!linkMap.has(key)) linkMap.set(key, []);
          linkMap.get(key)!.push({
            service_id: r.service_id ? toStr(r.service_id) : null,
            package_id: r.package_id ? toStr(r.package_id) : null,
          });
        });

        const merged: DiscountRow[] = (discRows ?? []).map((d: any) => {
          const id = toStr(d.discount_id);
          const links = linkMap.get(id) ?? [];
          const ids =
            (d.applies_to as AppliesTo) === "Service"
              ? (links.map((l) => l.service_id).filter(Boolean) as string[])
              : (links.map((l) => l.package_id).filter(Boolean) as string[]);
          return {
            discount_id: id,
            name: toStr(d.name),
            type: d.type as DiscountType,
            value: Number(d.value),
            applies_to: d.applies_to as AppliesTo,
            start_date: d.start_date ? String(d.start_date) : null,
            end_date: d.end_date ? String(d.end_date) : null,
            amount_of_uses:
              d.amount_of_uses == null ? null : Number(d.amount_of_uses),
            status: d.status as "Active" | "Inactive",
            included_services: Array.from(new Set(ids)),
            display: !!d.display,
          };
        });

        setDiscounts(merged);
        return { success: true, data: merged };
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
      }
    }, []);

  const updateDiscount = useCallback(
    async (
      discountId: string,
      form: DiscountFormData
    ): Promise<UpdateResult> => {
      try {
        const id = toStr(discountId);
        const targetIds = normIds(form.included_services);
        const amountOfUses: number | null =
          (form as any).amount_of_uses ?? (form as any).uses ?? null;

        // 1) Update main row
        const { error: updErr } = await supabase
          .from("Discounts")
          .update({
            name: form.name,
            type: form.type,
            value: form.value,
            applies_to: form.applies_to as AppliesTo,
            start_date: isoDate(form.start_date),
            end_date: isoDate(form.end_date),
            amount_of_uses: amountOfUses,
            status: form.status,
          })
          .eq("discount_id", id);
        if (updErr) throw updErr;

        // 2) Replace all links (delete first to avoid dup / wrong column)
        const { error: delErr } = await supabase
          .from("DiscountServices")
          .delete()
          .eq("discount_id", id);
        if (delErr) throw delErr;

        if (targetIds.length) {
          const rows =
            form.applies_to === "Service"
              ? targetIds.map((service_id) => ({
                  discount_id: id,
                  service_id,
                  package_id: null,
                }))
              : targetIds.map((package_id) => ({
                  discount_id: id,
                  service_id: null,
                  package_id,
                }));

          const { error: insErr } = await supabase
            .from("DiscountServices")
            .insert(rows);
          if (insErr) throw insErr;
        }

        // 3) Force a fresh read so UI reflects changes deterministically
        await fetchDiscounts();

        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
      }
    },
    [fetchDiscounts]
  );

  const deleteDiscount = useCallback(
    async (discountId: string): Promise<DeleteResult> => {
      try {
        await supabase
          .from("Discounts")
          .update({ display: false })
          .eq("discount_id", discountId);
        setDiscounts((prev) =>
          prev.filter((d) => d.discount_id !== discountId)
        );
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message ?? String(err) };
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
    updateDiscount,
    deleteDiscount,
  };
};

export default usePromoManagement;
