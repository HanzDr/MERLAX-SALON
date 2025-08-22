export type Service = {
  service_id: string;
  name: string;
  description: string;
  duration: number;
  min_price: number;
  max_price: number;
  display: boolean;
};

export type Stylist = {
  stylist_id: string;
  name: string;
  email: string;
  phoneNumber?: string; // optional in some cases
  role?: string; // optional because it might be blank
  display?: boolean; // soft-delete flag
  services?: string[]; // array of service IDs linked to stylist
  schedule?: {
    // array of day schedules for edit prefilling
    day: string;
    start_time: string;
    end_time: string;
  }[];
};

export type DaySchedule = { day: string; start_time: string; end_time: string };

export interface StylistSchedule {
  stylistSchedule_id: string;
  stylist_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}
