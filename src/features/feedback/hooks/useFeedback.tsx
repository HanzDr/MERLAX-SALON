// useFeedback.ts
"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import type {
  FeedbackCardProps,
  FeedbackCategory,
  Feedback,
} from "../utils/feedback-types";
import type {
  feedbackCategorizeData,
  feedbackFormData,
} from "@/validation/FeedbackSchema";
import { type UpdatePayload } from "../utils/feedback-types";

const useFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get all feedback with pagination (start/end indices)
  const getAllFeedback = useCallback(
    async (startingIndex: number, endingIndex: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supaErr } = await supabase
          .from("Feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .range(startingIndex, endingIndex);

        if (supaErr) throw supaErr;
        setFeedback(data ?? []);
        return { feedback: data ?? [] };
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

  // Get feedback by category
  const getFeedbackByCategory = useCallback(
    async (category: FeedbackCategory) => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supaErr } = await supabase
          .from("Feedback")
          .select("*")
          .eq("category", category)
          .order("created_at", { ascending: false });

        if (supaErr) throw supaErr;
        setFeedback(data ?? []);
        return { feedback: data ?? [] };
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

  // Create feedback and append to local state
  const createFeedbackForAppointment = useCallback(
    async (appointment_id: string) => {
      // 0) Prevent duplicates
      const { data: existing, error: existingErr } = await supabase
        .from("Feedback")
        .select("feedback_id")
        .eq("appointment_id", appointment_id)
        .limit(1);

      if (existingErr) throw existingErr;
      if (existing && existing.length > 0) {
        // already has a feedback entry; skip
        return existing[0];
      }

      // 1) Read names from Appointments (and maybe Customers)
      const { data: aRow, error: aErr } = await supabase
        .from("Appointments")
        .select("customer_id, firstName, middleName, lastName")
        .eq("appointment_id", appointment_id)
        .single();

      if (aErr) throw aErr;

      let firstName: string | null = aRow?.firstName ?? null;
      let middleName: string | null = aRow?.middleName ?? null;
      let lastName: string | null = aRow?.lastName ?? null;

      if (aRow?.customer_id) {
        const { data: cRow, error: cErr } = await supabase
          .from("Customers")
          .select("firstName, middleName, lastName")
          .eq("customer_id", aRow.customer_id)
          .single();
        if (cErr) throw cErr;

        firstName = cRow?.firstName ?? firstName;
        middleName = cRow?.middleName ?? middleName;
        lastName = cRow?.lastName ?? lastName;
      }

      // 2) Insert Feedback aligned to your schema
      const payload = {
        appointment_id,
        firstName,
        middleName,
        lastName,
        rating: null as number | null, // will be filled later by customer/admin
        category: null as string | null, // optional initial value
        admin_response: null as string | null, // optional initial value
        customer_response: null as string | null,
        // created_at is auto by DB default
      };

      const { data, error: insErr } = await supabase
        .from("Feedback")
        .insert(payload)
        .select(
          "feedback_id, appointment_id, firstName, middleName, lastName, rating, category, admin_response, customer_response, created_at"
        )
        .single();

      if (insErr) throw insErr;
      return data;
    },
    []
  );
  const updateFeedback = useCallback(async (updateForm: UpdatePayload) => {
    // Build a minimal patch based on the kind
    const patch =
      updateForm.kind === "categorize"
        ? { category: updateForm.category }
        : { comment: updateForm.comment };

    const { data, error: supaErr } = await supabase
      .from("Feedback")
      .update(patch)
      .eq("feedback_id", updateForm.feedbackId) // <-- ensure this PK matches your table
      .select()
      .single();

    if (supaErr) throw supaErr;

    // If your row shape == FeedbackCardProps, this is enough:
    setFeedback((prev) =>
      prev.map((f) =>
        f.feedbackId === updateForm.feedbackId ? { ...f, ...patch } : f
      )
    );

    return data; // updated row
  }, []);

  return {
    feedback, // current list in state (or null)
    isLoading,
    error,
    getAllFeedback,
    getFeedbackByCategory,
    createFeedbackForAppointment,
    updateFeedback,
  };
};

export default useFeedback;
