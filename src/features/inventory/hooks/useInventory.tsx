import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { addProductSchema } from "@/validation/InventorySchema";

export type Uom = { id: string; name: string };

export type Product = {
  product_id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  packaging: string | null;
  quantity: number | null;
  price: number | null;
  created_at: string;
  lowStockLevel?: number | null;
};

export type AddProductInput = {
  name: string;
  description: string;
  category: string;
  packaging: string;
  initialQuantity: string | number;
  sellingPrice: string | number;
};

const coerceAndValidate = (input: AddProductInput) => {
  const payload = {
    name: input.name,
    description: input.description,
    category: input.category,
    packaging: input.packaging,
    initialQuantity: Number(input.initialQuantity),
    sellingPrice: Number(input.sellingPrice),
  };
  return addProductSchema.parse(payload);
};

const useInventory = () => {
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [isLoadingUoms, setIsLoadingUoms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  /* Load UOMs */
  const fetchUoms = useCallback(async () => {
    setIsLoadingUoms(true);
    setLastError(null);
    try {
      const { data, error } = await supabase
        .from("UnitOfMeasure")
        .select("uom_id, uomName")
        .order("uomName", { ascending: true });

      if (error) throw error;

      const rows: Uom[] =
        (data ?? [])
          .filter((r) => r.uomName)
          .map((r) => ({
            id: r.uom_id as string,
            name: r.uomName as string,
          })) ?? [];

      setUoms(rows);
      return rows;
    } catch (e) {
      const err = e as Error;
      setLastError(err);
      throw err;
    } finally {
      setIsLoadingUoms(false);
    }
  }, []);

  /* Add UOM */
  const quickAddUom = useCallback(
    async (uomName: string) => {
      const trimmed = (uomName ?? "").trim();
      if (!trimmed) throw new Error("Packaging / UOM name is required.");

      const exists = uoms.some(
        (u) => u.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) throw new Error("That packaging already exists.");

      const { data, error } = await supabase
        .from("UnitOfMeasure")
        .insert({ uomName: trimmed })
        .select("uom_id, uomName")
        .single();

      if (error) throw error;

      const added: Uom = {
        id: data.uom_id as string,
        name: data.uomName as string,
      };
      setUoms((prev) =>
        [...prev, added].sort((a, b) => a.name.localeCompare(b.name))
      );
      return added;
    },
    [uoms]
  );

  /* Delete UOM */
  const deleteUom = useCallback(async (uomId: string) => {
    const { error } = await supabase
      .from("UnitOfMeasure")
      .delete()
      .eq("uom_id", uomId);
    if (error) throw error;
    setUoms((prev) => prev.filter((u) => u.id !== uomId));
  }, []);

  /* Add Product — also reflect on InventoryMovementLine (with category & packaging) */
  const addProduct = useCallback(async (input: AddProductInput) => {
    setIsSaving(true);
    setLastError(null);

    try {
      const validated = coerceAndValidate(input);

      // 1) Insert the product
      const { data, error } = await supabase
        .from("Products")
        .insert({
          name: validated.name.trim(),
          description: (validated.description ?? "").trim(),
          category: validated.category,
          packaging: validated.packaging,
          quantity: validated.initialQuantity,
          price: validated.sellingPrice,
        })
        .select(
          "product_id, name, description, category, packaging, quantity, price, created_at, lowStockLevel"
        )
        .single();

      if (error) throw error;

      // 2) Insert an initial movement line (denormalize name, category, packaging)
      const initialQty = Number(validated.initialQuantity || 0);
      if (initialQty > 0) {
        const movement = {
          product_id: data.product_id,
          product_name: data.name ?? validated.name.trim(),
          product_category: data.category ?? validated.category ?? null,
          product_packaging: data.packaging ?? validated.packaging ?? null,
          type: "ADD" as const,
          reason: "RESTOCK" as const,
          quantity: initialQty,
          isDisplay: true,
        };
        const { error: mErr } = await supabase
          .from("InventoryMovementLine")
          .insert(movement);
        if (mErr) throw mErr;
      }

      return data as Product;
    } catch (e) {
      setLastError(e as Error);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /* Set low stock level for a product */
  const setLowStockLevel = useCallback(
    async (productId: string, level: number) => {
      if (!productId) throw new Error("Missing product id.");
      if (!Number.isFinite(level) || level < 0) {
        throw new Error("Low stock level must be a non-negative number.");
      }

      const { error } = await supabase
        .from("Products")
        .update({ lowStockLevel: level })
        .eq("product_id", productId);

      if (error) throw error;
      return level;
    },
    []
  );

  return {
    uoms,
    isLoadingUoms,
    isSaving,
    lastError,

    fetchUoms,
    quickAddUom,
    deleteUom,
    addProduct,
    setLowStockLevel,
  };
};

export default useInventory;
