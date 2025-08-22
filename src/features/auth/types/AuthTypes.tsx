export type RoleTitle = "customer" | "admin";

export interface Customer {
  customer_id: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  joined_at: string;
  birthdate: Date;
  phoneNumber: number;
  role: string;
  is_blocked?: boolean;
}
