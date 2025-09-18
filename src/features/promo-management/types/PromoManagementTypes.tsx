/* ---------------------------- Packages (existing) ---------------------------- */

export interface Packages {
  package_id: string;
  name: string;
  price: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export type CreateResult =
  | { success: true; packageId: string }
  | { success: false; message: string };

export type UpdateResult =
  | { success: true }
  | { success: false; message: string };
export type DeleteResult =
  | { success: true }
  | { success: false; message: string };

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

/* ---------------------------- Discounts (new) ---------------------------- */

export type DiscountType = "Fixed" | "Percentage";
export type AppliesTo = "Service" | "Package";

export type DiscountFormData = {
  name: string;
  type: DiscountType; // "Fixed" | "Percentage"
  value: number; // Fixed = PHP; Percentage = %
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

export type CreateDiscountResult =
  | { success: true; discountId: string }
  | { success: false; message: string };

export type FetchDiscountsResult =
  | { success: true; data: DiscountRow[] }
  | { success: false; message: string };
