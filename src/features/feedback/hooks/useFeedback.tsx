import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import type {
  FeedbackCardProps,
  FeedbackCategory,
} from "../utils/feedback-types";
import type { UpdatePayload } from "../utils/feedback-types";

// Store the data-only version of the card (no UI handlers)
type FeedbackItem = Omit<FeedbackCardProps, "onCategorize" | "onRespond"> & {
  customerHasResponded: boolean;
  adminHasResponded: boolean;
};

const COLUMNS = [
  "feedback_id",
  "appointment_id",
  "customer_id",
  "firstName",
  "middleName",
  "lastName",
  "rating",
  "category",
  "admin_response",
  "customer_response",
  "created_at",
  "isDisplay",
  // new booleans
  "customerHasResponded",
  "adminHasResponded",
].join(", ");

/** DB row → UI shape (camelCase with safe fallbacks) */
function mapRowToItem(r: any): FeedbackItem {
  const category: FeedbackCategory =
    (r.category as FeedbackCategory | null) ?? "Neutral";

  const customerHasResponded: boolean = Boolean(r.customerHasResponded);
  const adminHasResponded: boolean = Boolean(r.adminHasResponded);

  return {
    feedbackId: r.feedback_id,
    // keep appointmentId around
    // @ts-ignore
    appointmentId: r.appointment_id ?? null,

    firstName: r.firstName ?? "",
    middleName: r.middleName ?? "",
    lastName: r.lastName ?? "",

    date: r.created_at,
    description: r.customer_response ?? r.admin_response ?? "",

    category,
    rating: Number(r.rating ?? 0),

    // new flags
    customerHasResponded,
    adminHasResponded,
  };
}

const useFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /** Get all site-wide (paginated by index range) — only visible rows */
  const getAllFeedback = useCallback(
    async (startingIndex: number, endingIndex: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supaErr } = await supabase
          .from("Feedback")
          .select(COLUMNS)
          .eq("isDisplay", true)
          .order("created_at", { ascending: false })
          .range(startingIndex, endingIndex);

        if (supaErr) throw supaErr;

        const rows = (data ?? []).map(mapRowToItem);
        setFeedback(rows);
        return { feedback: rows };
      } catch (e) {
        const err = e as Error;
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /** Get by category (site-wide) — only visible rows */
  const getFeedbackByCategory = useCallback(
    async (category: FeedbackCategory) => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supaErr } = await supabase
          .from("Feedback")
          .select(COLUMNS)
          .eq("isDisplay", true)
          .eq("category", category)
          .order("created_at", { ascending: false });

        if (supaErr) throw supaErr;

        const rows = (data ?? []).map(mapRowToItem);
        setFeedback(rows);
        return { feedback: rows };
      } catch (e) {
        const err = e as Error;
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /** Get feedback for a specific customer (pending/responded/all) — only visible rows */
  const getFeedbackByCustomer = useCallback(
    async (
      customerId: string,
      opts: { mode?: "all" | "pending" | "responded"; limit?: number } = {}
    ) => {
      const { mode = "all", limit = 50 } = opts;

      setIsLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("Feedback")
          .select(COLUMNS)
          .eq("isDisplay", true)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (mode === "pending") q = q.is("customer_response", null);
        if (mode === "responded") q = q.not("customer_response", "is", null);

        const { data, error: supaErr } = await q;
        if (supaErr) throw supaErr;

        const rows = (data ?? []).map(mapRowToItem);
        setFeedback(rows);
        return { feedback: rows };
      } catch (e) {
        const err = e as Error;
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create feedback for an appointment (idempotent).
   * ✅ Fetches Appointments first to get the current customer_id and names,
   *    then stores that customer_id into Feedback.customer_id.
   */
  const createFeedbackForAppointment = useCallback(
    async (appointment_id: string) => {
      // Prevent duplicates
      const { data: existing, error: existingErr } = await supabase
        .from("Feedback")
        .select("feedback_id")
        .eq("appointment_id", appointment_id)
        .limit(1);

      if (existingErr) throw existingErr;
      if (existing && existing.length > 0) {
        return { feedbackId: existing[0].feedback_id };
      }

<<<<<<< HEAD
      // Pull display name & customer_id from Appointments
=======
      // Pull display name & customer_id from Appointments (authoritative at completion time)
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      const { data: aRow, error: aErr } = await supabase
        .from("Appointments")
        .select("customer_id, firstName, middleName, lastName")
        .eq("appointment_id", appointment_id)
        .single();

      if (aErr) throw aErr;

      let firstName: string | null = aRow?.firstName ?? null;
      let middleName: string | null = aRow?.middleName ?? null;
      let lastName: string | null = aRow?.lastName ?? null;
      const customer_id: string | null = aRow?.customer_id ?? null;

<<<<<<< HEAD
      // Prefer canonical names from Customers
=======
      // If it’s a customer account, prefer canonical names from Customers
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      if (customer_id) {
        const { data: cRow, error: cErr } = await supabase
          .from("Customers")
          .select("firstName, middleName, lastName")
          .eq("customer_id", customer_id)
          .single();

        if (cErr) throw cErr;

        firstName = cRow?.firstName ?? firstName;
        middleName = cRow?.middleName ?? middleName;
        lastName = cRow?.lastName ?? lastName;
      }

      const payload = {
        appointment_id,
        customer_id, // ✅ persisted for customer-centric queries
        firstName,
        middleName,
        lastName,
        rating: null,
        category: null,
        admin_response: null,
        customer_response: null,
        isDisplay: true,
<<<<<<< HEAD
        // initialize flags
        customerHasResponded: false,
        adminHasResponded: false,
=======
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      };

      const { data, error: insErr } = await supabase
        .from("Feedback")
        .insert(payload)
        .select(COLUMNS)
        .single();

      if (insErr) throw insErr;

      const mapped = mapRowToItem(data);
      setFeedback((prev) => [mapped, ...(prev ?? [])]);
      return mapped;
    },
    []
  );

  /** Update a feedback row (categorize or respond) */
  const updateFeedback = useCallback(async (updateForm: UpdatePayload) => {
    if (!updateForm.feedbackId) {
      throw new Error("Missing feedbackId for update.");
    }

    type Patch =
      | { category: FeedbackCategory | null }
      | { admin_response: string | null; adminHasResponded?: boolean }
      | { customer_response: string | null; customerHasResponded?: boolean };

    let patch: Patch;

    if (updateForm.kind === "categorize") {
      patch = { category: updateForm.category ?? null };
    } else {
      const isCustomer = updateForm.respondAs === "customer";
      const col = isCustomer ? "customer_response" : "admin_response";
      const text = (updateForm.comment ?? "").trim() || null;

      if (isCustomer) {
        patch = {
          customer_response: text,
          customerHasResponded: Boolean(text),
        };
      } else {
        patch = {
          admin_response: text,
          adminHasResponded: Boolean(text),
        };
      }
    }

    const { data, error: supaErr } = await supabase
      .from("Feedback")
      .update(patch)
      .eq("feedback_id", updateForm.feedbackId)
      .select(COLUMNS)
      .single();

    if (supaErr) throw supaErr;

    const updatedItem = mapRowToItem(data);

    setFeedback((prev) =>
      (prev ?? []).map((f) =>
        f.feedbackId === updateForm.feedbackId ? { ...f, ...updatedItem } : f
      )
    );

    return updatedItem;
  }, []);

  /**
   * Latest feedback (by this customer) with no customer_response
   * + its plan/services/packages (used for "prompt to respond" flow)
   * Only visible rows.
   */
  const getUnrepliedCustomerFeedback = useCallback(
    async (customerId: string) => {
      const { data: csf, error: csfError } = await supabase
        .from("Feedback")
        .select(
          "feedback_id, appointment_id, customer_id, customer_response, created_at, isDisplay"
        )
        .eq("isDisplay", true)
        .eq("customer_id", customerId)
        .is("customer_response", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (csfError) throw csfError;
      if (!csf) {
        return {
          feedback: null,
          appointmentPlan: [],
          services: [],
          packages: [],
        } as const;
      }

      const csfAppointmentId = csf.appointment_id;
      if (!csfAppointmentId) {
        return {
          feedback: csf,
          appointmentPlan: [],
          services: [],
          packages: [],
        } as const;
      }

      // plan rows (service and package ids)
      const { data: planRows, error: planError } = await supabase
        .from("AppointmentServicePlan")
        .select("service_id, package_id")
        .eq("appointment_id", csfAppointmentId);

      if (planError) throw planError;

      const serviceIds = [
        ...new Set((planRows ?? []).map((p) => p.service_id).filter(Boolean)),
      ] as string[];

      const packageIds = [
        ...new Set((planRows ?? []).map((p) => p.package_id).filter(Boolean)),
      ] as string[];

      const { data: services, error: servicesError } = serviceIds.length
        ? await supabase
            .from("Services")
            .select("*")
            .in("service_id", serviceIds)
        : { data: [], error: null as any };

      if (servicesError) throw servicesError;

      const { data: packages, error: packagesError } = packageIds.length
        ? await supabase
            .from("Package")
            .select("*")
            .in("package_id", packageIds)
        : { data: [], error: null as any };

      if (packagesError) throw packagesError;

      return {
        feedback: csf,
        appointmentPlan: planRows ?? [],
        services: services ?? [],
        packages: packages ?? [],
      } as const;
    },
    []
  );

  /** Soft delete (hide) a feedback by flipping isDisplay=false */
  const softDeleteFeedback = useCallback(async (feedbackId: string) => {
    if (!feedbackId) throw new Error("Missing feedbackId for delete.");

    const { error: supaErr } = await supabase
      .from("Feedback")
      .update({ isDisplay: false })
      .eq("feedback_id", feedbackId);

    if (supaErr) throw supaErr;

    // Optimistic UI: remove from local state
    setFeedback((prev) =>
      (prev ?? []).filter((f) => f.feedbackId !== feedbackId)
    );
    return { ok: true as const };
  }, []);

  return {
    feedback,
    isLoading,
    error,
    getAllFeedback,
    getFeedbackByCategory,
    getFeedbackByCustomer,
    createFeedbackForAppointment,
    updateFeedback,
    getUnrepliedCustomerFeedback,
    softDeleteFeedback,
  };
};

export default useFeedback;
