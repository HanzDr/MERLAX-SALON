import React, { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabaseclient";

import ProductTable, {
  type ProductRow,
} from "@/features/inventory/components/ui/product-table";
import AddNewProductModal, {
  type Values as ProductValues,
} from "@/features/inventory/components/ui/add-new-product-modal";
import QuickUomModal from "@/features/inventory/components/ui/quick-uom-modal";
import QuickCategoryModal from "@/features/inventory/components/ui/quick-category-modal";
import InventoryMoveModal, {
  type MoveRow as MoveLineRow,
} from "@/features/inventory/components/ui/inventory-move-modal";
import InventoryMoveTable, {
  type MovementRow,
} from "@/features/inventory/components/ui/inventory-move-table";

import useInventory from "@/features/inventory/hooks/useInventory";
import { addProductSchema } from "@/validation/InventorySchema";
import { PlusCircle, MoveRight } from "lucide-react";

const DEFAULT_VALUES: ProductValues = {
  name: "",
  description: "",
  category: "",
  packaging: "",
  initialQuantity: "10",
  sellingPrice: "400",
};

const AdminInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"inventory" | "movement">(
    "inventory"
  );

  /* ---------------------- Product Table State ---------------------- */
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [lowStockFilter, setLowStockFilter] = useState<
    "all" | "low" | "notlow"
  >("all");

  /* --------------------- Movement Table State ---------------------- */
  const [moveSearch, setMoveSearch] = useState("");
  const [movePage, setMovePage] = useState(1);
  const [movePageSize, setMovePageSize] = useState(5);
  const [moveRowsTable, setMoveRowsTable] = useState<MovementRow[]>([]);
  const [moveTotal, setMoveTotal] = useState(0);
  const [moveLoading, setMoveLoading] = useState(false);

  /* --------------------- Modals + UOM logic ---------------------- */
  const [openAdd, setOpenAdd] = useState(false);
  const [values, setValues] = useState<ProductValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductValues, string>>
  >({});
  const [openUom, setOpenUom] = useState(false);
  const [newUomName, setNewUomName] = useState("");
  const [uomMutating, setUomMutating] = useState(false);

  /* --------------------- Category modal state + options ---------------------- */
  const [openCat, setOpenCat] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [catLoading, setCatLoading] = useState(false);
  const [catMutating, setCatMutating] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  /* --------------------- Movement modal state ---------------------- */
  const [openMove, setOpenMove] = useState(false);
  const [moveRows, setMoveRows] = useState<MoveLineRow[]>([]);
  const [moveSaving, setMoveSaving] = useState(false);

  // include category, packaging, currentQty, and price for validation & labels
  const [productOptions, setProductOptions] = useState<
    {
      id: string;
      name: string;
      category?: string | null;
      packaging?: string | null;
      currentQty: number;
      price: number; // used to stamp product_unit_price on submit
    }[]
  >([]);

  const {
    uoms,
    isLoadingUoms,
    isSaving,
    fetchUoms,
    quickAddUom,
    deleteUom,
    addProduct,
  } = useInventory();

  /* ------------------------- Categories (Supabase) ------------------------- */
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const { data, error } = await supabase
        .from("ProductCategory")
        .select(`ProductCategory_id, category_name`)
        .order("category_name", { ascending: true });

      if (error) throw error;
      const rows =
        (data ?? [])
          .filter((r) => r.category_name)
          .map((r) => ({
            id: r.ProductCategory_id as string,
            name: r.category_name as string,
          })) ?? [];
      setCategories(rows);
      return rows;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setCatLoading(false);
    }
  }, []);

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = (name ?? "").trim();
      if (!trimmed) return;
      setCatMutating(true);
      try {
        const exists = categories.some(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) {
          alert("That category already exists.");
          return;
        }
        const { data, error } = await supabase
          .from("ProductCategory")
          .insert({ category_name: trimmed })
          .select("ProductCategory_id, category_name")
          .single();
        if (error) throw error;
        setCategories((prev) =>
          [
            ...prev,
            { id: data.ProductCategory_id, name: data.category_name },
          ].sort((a, b) => a.name.localeCompare(b.name))
        );
        setNewCatName("");
      } catch (e: any) {
        alert(e.message ?? "Failed to add category.");
      } finally {
        setCatMutating(false);
      }
    },
    [categories]
  );

  const deleteCategory = useCallback(async (id: string) => {
    setCatMutating(true);
    try {
      const { error } = await supabase
        .from("ProductCategory")
        .delete()
        .eq("ProductCategory_id", id);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e.message ?? "Failed to delete category.");
    } finally {
      setCatMutating(false);
    }
  }, []);

  /* --- fetch categories on page load so the filter dropdown is populated immediately --- */
  useEffect(() => {
    fetchCategories().catch(() => {});
  }, [fetchCategories]);

  /* Load UOMs & Categories whenever Add Product modal is opened */
  useEffect(() => {
    if (openAdd) {
      fetchUoms().catch(() => {});
      fetchCategories().catch(() => {});
    }
  }, [openAdd, fetchUoms, fetchCategories]);

  /* Also (re)load categories when category modal opens */
  useEffect(() => {
    if (openCat) fetchCategories().catch(() => {});
  }, [openCat, fetchCategories]);

  /* ------------------------- Fetch Products ------------------------- */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim();

      // Base query (server-side filters we *can* express)
      let base = supabase
        .from("Products")
        .select(
          'product_id, name, description, category, packaging, quantity, price, created_at, lowStockLevel, "isDisplay"',
          { count: "exact" }
        )
        // show visible or legacy (NULL) rows
        .or("isDisplay.is.null,isDisplay.eq.true");

      if (q) {
        base = base.or(
          `name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`
        );
      }
      if (categoryFilter) {
        base = base.eq("category", categoryFilter);
      }

      // Client-side low/notlow filter
      if (lowStockFilter !== "all") {
        const { data, error } = await base.order("created_at", {
          ascending: false,
        });
        if (error) throw error;

        const allMapped: ProductRow[] =
          (data ?? []).map((r) => ({
            id: r.product_id,
            name: r.name ?? "",
            category: r.category ?? "",
            description: r.description ?? "",
            packaging: r.packaging ?? "",
            quantity: Number(r.quantity ?? 0),
            price: Number(r.price ?? 0),
            lastUpdated: new Date(r.created_at).toISOString(),
            image: null,
            lowStockLevel: r.lowStockLevel ?? null,
          })) ?? [];

        const filtered = allMapped.filter((p) => {
          const hasLow =
            typeof p.lowStockLevel === "number" &&
            Number.isFinite(p.lowStockLevel);
          if (lowStockFilter === "low") {
            return hasLow && p.quantity <= (p.lowStockLevel as number);
          } else {
            return !hasLow || p.quantity > (p.lowStockLevel as number);
          }
        });

        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRows(filtered.slice(from, to));
        setTotal(filtered.length);
        return;
      }

      // Normal path (server pagination)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await base
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const mapped: ProductRow[] =
        (data ?? []).map((r) => ({
          id: r.product_id,
          name: r.name ?? "",
          category: r.category ?? "",
          description: r.description ?? "",
          packaging: r.packaging ?? "",
          quantity: Number(r.quantity ?? 0),
          price: Number(r.price ?? 0),
          lastUpdated: new Date(r.created_at).toISOString(),
          image: null,
          lowStockLevel: r.lowStockLevel ?? null,
        })) ?? [];

      setRows(mapped);
      setTotal(count ?? mapped.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, lowStockFilter, page, pageSize]);

  useEffect(() => {
    if (activeTab === "inventory") fetchProducts();
  }, [fetchProducts, activeTab]);

  /* ------------------------- Fetch Movements ------------------------- */
  const fetchMovements = useCallback(async () => {
    setMoveLoading(true);
    try {
      const q = moveSearch.trim();
      const from = (movePage - 1) * movePageSize;
      const to = from + movePageSize - 1;

      // search by product name -> find ids (optional)
      let productIdsForFilter: string[] | null = null;
      if (q) {
        const { data: prodMatches, error: prodErr } = await supabase
          .from("Products")
          .select("product_id, name")
          .ilike("name", `%${q}%`);
        if (prodErr) throw prodErr;
        productIdsForFilter = (prodMatches ?? []).map((p) => p.product_id);
      }

      let lineQuery = supabase
        .from("InventoryMovementLine")
        .select(
          `"InventoryMovementLine_id", product_id, product_name, product_category, product_packaging, type, reason, quantity, product_unit_price, created_at, isDisplay`,
          { count: "exact" }
        )
        .eq("isDisplay", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (productIdsForFilter && productIdsForFilter.length > 0) {
        lineQuery = lineQuery.in("product_id", productIdsForFilter);
      } else if (q) {
        lineQuery = lineQuery.ilike("product_name", `%${q}%`);
      }

      const { data: lines, error: lineErr, count } = await lineQuery;
      if (lineErr) throw lineErr;

      // Hydrate missing unit prices by looking up Products.price
      const missingPriceIds = Array.from(
        new Set(
          (lines ?? [])
            .filter(
              (r: any) =>
                r &&
                (!Number.isFinite(Number(r.product_unit_price)) ||
                  Number(r.product_unit_price) <= 0)
            )
            .map((r: any) => r.product_id)
            .filter(Boolean)
        )
      ) as string[];

      let priceById = new Map<string, number>();
      if (missingPriceIds.length > 0) {
        const { data: prodPriceRows, error: prodPriceErr } = await supabase
          .from("Products")
          .select("product_id, price")
          .in("product_id", missingPriceIds);
        if (prodPriceErr) throw prodPriceErr;
        (prodPriceRows ?? []).forEach((p) =>
          priceById.set(p.product_id, Number(p.price ?? 0))
        );
      }

      const mapped: MovementRow[] =
        (lines ?? []).map((r: any) => {
          const unitFromRow =
            r.product_unit_price != null
              ? Number(r.product_unit_price)
              : undefined;
          const hydrated =
            unitFromRow && Number.isFinite(unitFromRow) && unitFromRow > 0
              ? unitFromRow
              : priceById.get(r.product_id) ?? null;

          return {
            id: r.InventoryMovementLine_id,
            productId: r.product_id,
            productName: r.product_name ?? "—",
            productCategory: r.product_category ?? null,
            productPackaging: r.product_packaging ?? null,
            movementType: r.type,
            reason: r.reason,
            quantity: Number(r.quantity),
            createdAt: new Date(r.created_at).toISOString(),
            productUnitPrice: hydrated,
          };
        }) ?? [];

      setMoveRowsTable(mapped);
      setMoveTotal(count ?? mapped.length);
    } catch (e) {
      console.error(e);
    } finally {
      setMoveLoading(false);
    }
  }, [movePage, movePageSize, moveSearch]);

  useEffect(() => {
    if (activeTab === "movement") fetchMovements();
  }, [fetchMovements, activeTab]);

  /* ----------------------- Product Add + UOM ----------------------- */
  const handleChange = (field: keyof ProductValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validateForUI = (v: ProductValues) => {
    setErrors({});
    try {
      addProductSchema.parse({
        ...v,
        initialQuantity: Number(v.initialQuantity),
        sellingPrice: Number(v.sellingPrice),
      });
      return true;
    } catch (e) {
      const zerr = e as z.ZodError;
      const fieldErrors: Partial<Record<keyof ProductValues, string>> = {};
      for (const issue of zerr.issues) {
        const key = issue.path[0] as keyof ProductValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
  };

  const handleSubmitAdd = async () => {
    if (!validateForUI(values)) return;
    try {
      await addProduct({
        ...values,
        initialQuantity: Number(values.initialQuantity),
        sellingPrice: Number(values.sellingPrice),
      });

      setOpenAdd(false);
      setValues(DEFAULT_VALUES);
      setPage(1);
      await fetchProducts();
      if (activeTab === "movement") await fetchMovements();
    } catch (e: any) {
      alert(e.message ?? "Failed to add product.");
    }
  };

  /* ---------------------- Inventory Movement ---------------------- */
  const openMoveModal = async () => {
    try {
      const { data, error } = await supabase
        .from("Products")
        .select("product_id, name, category, packaging, quantity, price")
        .order("name");
      if (error) throw error;

      setProductOptions(
        (data ?? []).map((r) => ({
          id: r.product_id,
          name: r.name ?? "",
          category: r.category ?? null,
          packaging: r.packaging ?? null,
          currentQty: Number(r.quantity ?? 0),
          price: Number(r.price ?? 0),
        }))
      );
      setMoveRows([
        {
          tempId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          productId: "",
          movementType: "ADD",
          reason: "",
          quantity: "1",
        },
      ]);
      setOpenMove(true);
    } catch (e: any) {
      alert(e.message ?? "Failed to load products for movement.");
    }
  };

  const addMoveRow = () =>
    setMoveRows((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now() + Math.random()),
        productId: "",
        movementType: "ADD",
        reason: "",
        quantity: "1",
      },
    ]);

  const removeMoveRow = (tempId: string) =>
    setMoveRows((prev) => prev.filter((r) => r.tempId !== tempId));

  const changeMoveRow = (
    tempId: string,
    field: keyof MoveLineRow,
    value: string
  ) =>
    setMoveRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );

  /** Insert movement lines AND update Products.quantity accordingly. */
  const submitMovement = async () => {
    for (const r of moveRows) {
      if (!r.productId) return alert("Please select a product for all rows.");
      const qty = Number(r.quantity);
      if (!qty || qty <= 0) return alert("Quantity must be > 0.");
      if (r.movementType !== "ADD" && r.movementType !== "DEDUCT") {
        return alert("Movement type must be ADD or DEDUCT.");
      }
    }

    setMoveSaving(true);
    try {
      const nameById = new Map<string, string>();
      const categoryById = new Map<string, string | null | undefined>();
      const packagingById = new Map<string, string | null | undefined>();
      const priceById = new Map<string, number>();
      productOptions.forEach((p) => {
        nameById.set(p.id, p.name);
        categoryById.set(p.id, p.category);
        packagingById.set(p.id, p.packaging);
        priceById.set(p.id, Number(p.price ?? 0));
      });

      const deltas = new Map<string, number>();
      const deductions = new Map<string, number>();
      for (const r of moveRows) {
        const q = Number(r.quantity);
        const sign = r.movementType === "ADD" ? 1 : -1;
        deltas.set(r.productId, (deltas.get(r.productId) ?? 0) + sign * q);
        if (r.movementType === "DEDUCT") {
          deductions.set(r.productId, (deductions.get(r.productId) ?? 0) + q);
        }
      }

      const affectedIds = Array.from(new Set(moveRows.map((r) => r.productId)));

      // pre-check stock for deductions
      if (affectedIds.length > 0) {
        const { data: prodRows, error: qErr } = await supabase
          .from("Products")
          .select("product_id, quantity")
          .in("product_id", affectedIds);
        if (qErr) throw qErr;

        const currentQtyById = new Map<string, number>();
        (prodRows ?? []).forEach((p) =>
          currentQtyById.set(p.product_id, Number(p.quantity ?? 0))
        );

        for (const pid of affectedIds) {
          const wantDeduct = deductions.get(pid) ?? 0;
          if (wantDeduct > 0) {
            const available = currentQtyById.get(pid) ?? 0;
            if (wantDeduct > available) {
              const pMeta = productOptions.find((p) => p.id === pid);
              const label =
                pMeta?.packaging && pMeta.packaging.trim().length > 0
                  ? `${pMeta?.name} - ${pMeta?.packaging}`
                  : pMeta?.name || pid;
              alert(
                `Cannot deduct ${wantDeduct} from "${label}". Available: ${available}.`
              );
              setMoveSaving(false);
              return;
            }
          }
        }
      }

      // insert movement lines with captured unit price
      const lines = moveRows.map((r) => ({
        product_id: r.productId,
        product_name: nameById.get(r.productId) ?? null,
        product_category: categoryById.get(r.productId) ?? null,
        product_packaging: packagingById.get(r.productId) ?? null,
        type: r.movementType,
        reason: r.reason || null,
        quantity: Number(r.quantity),
        isDisplay: true,
        product_unit_price: priceById.get(r.productId) ?? null,
      }));

      const { error: lineErr } = await supabase
        .from("InventoryMovementLine")
        .insert(lines);
      if (lineErr) throw lineErr;

      // update Products.quantity
      if (affectedIds.length > 0) {
        const { data: prodRows2, error: qErr2 } = await supabase
          .from("Products")
          .select("product_id, quantity")
          .in("product_id", affectedIds);
        if (qErr2) throw qErr2;

        const deltasMap = new Map<string, number>();
        moveRows.forEach((r) => {
          const q = Number(r.quantity);
          const sign = r.movementType === "ADD" ? 1 : -1;
          deltasMap.set(
            r.productId,
            (deltasMap.get(r.productId) ?? 0) + sign * q
          );
        });

        const updates = (prodRows2 ?? []).map((p) => {
          const current = Number(p.quantity ?? 0);
          const delta = deltasMap.get(p.product_id) ?? 0;
          const next = current + delta;
          return supabase
            .from("Products")
            .update({ quantity: next })
            .eq("product_id", p.product_id);
        });

        const results = await Promise.all(updates);
        const failed = results.find((r) => (r as any).error);
        if ((failed as any)?.error) throw (failed as any).error;
      }

      setOpenMove(false);
      await fetchMovements();
      await fetchProducts();
    } catch (e: any) {
      alert(e.message ?? "Failed to save inventory movement.");
    } finally {
      setMoveSaving(false);
    }
  };

  /* ---------------------- SOFT delete a product (with movement guard) ---------------------- */
  const handleDelete = useCallback(
    async (id: string) => {
      // 1) Check if there are any *visible* movement logs for this product
      const { count, error: existsErr } = await supabase
        .from("InventoryMovementLine")
        .select("InventoryMovementLine_id", { count: "exact", head: true })
        .eq("product_id", id)
        .eq("isDisplay", true);

      if (existsErr) {
        alert(existsErr.message ?? "Failed to verify movement logs.");
        return;
      }

      if ((count ?? 0) > 0) {
        alert(
          "This product has inventory movement logs. Please delete those movement entries first before hiding the product."
        );
        setActiveTab("movement");
        return;
      }

      const yes = window.confirm(
        "Hide this product from inventory? You can restore it later."
      );
      if (!yes) return;

      try {
        // 2) SOFT DELETE via isDisplay=false (your column name)
        const { error } = await supabase
          .from("Products")
          .update({ isDisplay: false })
          .eq("product_id", id);
        if (error) throw error;

        await fetchProducts();
        if (activeTab === "movement") await fetchMovements();
      } catch (e: any) {
        alert(e.message ?? "Failed to hide product.");
      }
    },
    [fetchProducts, fetchMovements, activeTab]
  );

  const categoryOptions = categories.map((c) => c.name);

  return (
<<<<<<< HEAD
=======
    // ⬇️ Removed `lg:ml-64` so the page is no longer pushed far to the right
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
    <main className="min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>

<<<<<<< HEAD
        {/* Tabs — modern pill style */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("inventory")}
            className={[
              "relative rounded-full px-4 py-2 text-sm font-semibold transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
              activeTab === "inventory"
                ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200",
            ].join(" ")}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab("movement")}
            className={[
              "relative rounded-full px-4 py-2 text-sm font-semibold transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
              activeTab === "movement"
                ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200",
            ].join(" ")}
          >
            Stock Movement
          </button>
=======
        {/* Tabs */}
        <div className="mt-5 flex items-center gap-3">
          {["inventory", "movement"].map((tab) => (
            <button
              key={tab}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-amber-400 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab(tab as "inventory" | "movement")}
            >
              {tab === "inventory" ? "Inventory" : "Stock Movement"}
            </button>
          ))}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
        </div>

        {/* Header + Actions */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold ">
              {activeTab === "inventory"
                ? "Inventory Overview"
                : "Stock Movements"}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === "inventory"
                ? "Manage your product inventory and stock levels"
                : "Track all stock in/out transactions"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "movement" ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
                onClick={openMoveModal}
              >
                <MoveRight className="h-4 w-4" />
                New Inventory Movement
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
                onClick={() => setOpenAdd(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Add New Product
              </button>
            )}
          </div>
        </div>

        {/* Conditional Tables */}
        <div className="mt-6">
          {activeTab === "inventory" ? (
            <ProductTable
              rows={rows}
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              onDelete={handleDelete}
              loading={loading}
              currencyPrefix="₱"
              onEdited={fetchProducts}
              categoryOptions={categoryOptions}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              lowStockFilter={lowStockFilter}
              onLowStockFilterChange={(v) => {
                setLowStockFilter(v);
                setPage(1);
              }}
            />
          ) : (
            <InventoryMoveTable
              rows={moveRowsTable}
              search={moveSearch}
              onSearchChange={(v) => {
                setMoveSearch(v);
                setMovePage(1);
              }}
              page={movePage}
              pageSize={movePageSize}
              total={moveTotal}
              onPageChange={setMovePage}
              onPageSizeChange={(n) => {
                setMovePageSize(n);
                setMovePage(1);
              }}
              loading={moveLoading}
              onDelete={async (id) => {
                try {
                  const { error } = await supabase
                    .from("InventoryMovementLine")
                    .update({ isDisplay: false })
                    .eq("InventoryMovementLine_id", id);
                  if (error) throw error;
                  await fetchMovements();
                } catch (e: any) {
                  alert(e.message ?? "Failed to delete movement.");
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <AddNewProductModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleSubmitAdd}
        onChange={handleChange}
        onQuickManageCategory={() => setOpenCat(true)}
        onQuickAddUom={() => setOpenUom(true)}
        values={values}
        errors={errors}
        categoryOptions={categories.map((c) => c.name)}
        uomOptions={uoms.map((u) => ({ id: u.id, name: u.name }))}
        isSaving={isSaving}
        isLoadingUoms={isLoadingUoms}
      />

      <QuickCategoryModal
        open={openCat}
        onClose={() => setOpenCat(false)}
        categories={categories}
        isLoading={catLoading}
        isMutating={catMutating}
        newName={newCatName}
        onNewNameChange={setNewCatName}
        onAdd={() => addCategory(newCatName)}
        onDelete={deleteCategory}
      />

      <QuickUomModal
        open={openUom}
        onClose={() => setOpenUom(false)}
        uoms={uoms.map((u) => ({ id: u.id, name: u.name }))}
        isLoading={isLoadingUoms}
        isMutating={uomMutating}
        newName={newUomName}
        onNewNameChange={setNewUomName}
        onAdd={async () => {
          try {
            setUomMutating(true);
            await quickAddUom(newUomName);
            await fetchUoms();
            setNewUomName("");
          } finally {
            setUomMutating(false);
          }
        }}
        onDelete={deleteUom}
      />

      <InventoryMoveModal
        open={openMove}
        onClose={() => setOpenMove(false)}
        onSubmit={submitMovement}
        rows={moveRows}
        onAddRow={addMoveRow}
        onRemoveRow={removeMoveRow}
        onChange={changeMoveRow}
        productOptions={productOptions}
        isSaving={moveSaving}
      />
    </main>
  );
};

export default AdminInventory;
