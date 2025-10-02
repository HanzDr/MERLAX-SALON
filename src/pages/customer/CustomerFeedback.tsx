import React, { useEffect, useState } from "react";
import SubmitFeedback from "@/features/feedback/components/sections/submit-feedback-section";
import SubmitFeedbackForm from "@/features/feedback/components/ui/submit-feedback-form";
import { useFeedbackContext } from "@/features/feedback/context/FeedbackContext";
import useUserProfile from "@/features/auth/hooks/UseUserProfile";
import { supabase } from "@/lib/supabaseclient";
import ViewResponseModal, {
  type ViewResponseData,
} from "@/features/feedback/components/ui/view-feedback-response";

export interface unrespondedFeedbackRow {
  feedback_id: string;
  appointment_id: string | null;
  customer_id: string | null;
  customer_response: string | null;
  created_at: string; // ISO string
  services?: string[]; // service names
  package_name?: string; // joined package names (", ")
}

type ApptMeta = {
  dateISO: string;
  serviceName: string;
  startHHMM: string;
  endHHMM: string;
};

const CustomerFeedback: React.FC = () => {
  const { getFeedbackByCustomer } = useFeedbackContext();
  const { user } = useUserProfile();

  const [rows, setRows] = useState<unrespondedFeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // respond modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(
    null
  );
  const [apptMeta, setApptMeta] = useState<ApptMeta | null>(null);

  // view modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<ViewResponseData | null>(null);

  // ---------- load ALL feedback (pending + responded) with Service/Package names ----------
  useEffect(() => {
    if (!user?.id) {
      setRows([]);
      return;
    }

    let mounted = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1) Fetch all feedback rows for this customer
        const res = await getFeedbackByCustomer(user.id, {
          mode: "all",
          limit: 50,
        });
        const feedbackList = res.feedback ?? [];

        // 2) Collect appointment_ids for joins
        const apptIds = Array.from(
          new Set(
            feedbackList
              .map((f: any) => f.appointmentId)
              .filter((id: string | null) => !!id)
          )
        ) as string[];

        // Short-circuit if no appointments
        let apptIdToNames: Record<
          string,
          { services: string[]; packages: string[] }
        > = {};
        if (apptIds.length) {
          // 3) Pull plan rows (service_id, package_id) for all those appointments
          const { data: planRows, error: planErr } = await supabase
            .from("AppointmentServicePlan")
            .select("appointment_id, service_id, package_id")
            .in("appointment_id", apptIds);

          if (planErr) throw planErr;

          // 4) Build distinct IDs to fetch names
          const serviceIds = Array.from(
            new Set((planRows ?? []).map((p) => p.service_id).filter(Boolean))
          ) as string[];

          const packageIds = Array.from(
            new Set((planRows ?? []).map((p) => p.package_id).filter(Boolean))
          ) as string[];

          // 5) Fetch service names
          const serviceMap: Record<string, string> = {};
          if (serviceIds.length) {
            const { data: services, error: servicesErr } = await supabase
              .from("Services")
              .select("service_id, name")
              .in("service_id", serviceIds);
            if (servicesErr) throw servicesErr;
            (services ?? []).forEach((s) => {
              if (s?.service_id && s?.name) serviceMap[s.service_id] = s.name;
            });
          }

          // 6) Fetch package names
          const packageMap: Record<string, string> = {};
          if (packageIds.length) {
            const { data: packages, error: packagesErr } = await supabase
              .from("Package")
              .select("package_id, name")
              .in("package_id", packageIds);
            if (packagesErr) throw packagesErr;
            (packages ?? []).forEach((p) => {
              if (p?.package_id && p?.name) packageMap[p.package_id] = p.name;
            });
          }

          // 7) Build appointmentId → {services[], packages[]} names map
          apptIdToNames = (planRows ?? []).reduce((acc, row) => {
            const aId = row.appointment_id as string;
            if (!acc[aId]) acc[aId] = { services: [], packages: [] };
            if (row.service_id && serviceMap[row.service_id]) {
              acc[aId].services.push(serviceMap[row.service_id]);
            }
            if (row.package_id && packageMap[row.package_id]) {
              acc[aId].packages.push(packageMap[row.package_id]);
            }
            return acc;
          }, {} as Record<string, { services: string[]; packages: string[] }>);
        }

        // 8) Map to table rows with proper Service/Package labels
        const rowsMapped: unrespondedFeedbackRow[] = feedbackList.map(
          (f: any) => {
            const appointment_id = (f.appointmentId ?? null) as string | null;
            const names = appointment_id
              ? apptIdToNames[appointment_id]
              : undefined;
            const services = names?.services?.length
              ? Array.from(new Set(names.services))
              : undefined;
            const package_name = names?.packages?.length
              ? Array.from(new Set(names.packages)).join(", ")
              : undefined;

            return {
              feedback_id: f.feedbackId,
              appointment_id,
              customer_id: user.id,
              // For enable/disable logic, use raw customer response (not derived)
              customer_response: f.description ? f.description : null,
              created_at: f.date,
              services,
              package_name,
            };
          }
        );

        if (mounted) setRows(rowsMapped);
      } catch (e: any) {
        mounted && setError(e?.message ?? "Failed to load feedback.");
      } finally {
        mounted && setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id, getFeedbackByCustomer]);

  // ---------- handlers ----------
  const onRespond = async (feedbackId: string) => {
    const row = rows.find((r) => r.feedback_id === feedbackId);
    if (!row) return;

    if (row.customer_response) {
      alert("You've already submitted feedback for this appointment.");
      return;
    }

    // pull appointment info for the modal header
    let dateISO = new Date().toISOString().slice(0, 10);
    let startHHMM = "09:00";
    let endHHMM = "10:00";

    if (row.appointment_id) {
      const { data: appt } = await supabase
        .from("Appointments")
        .select("date, expectedStart_time, expectedEnd_time")
        .eq("appointment_id", row.appointment_id)
        .single();

      if (appt) {
        dateISO = appt.date;
        startHHMM = String(appt.expectedStart_time).slice(0, 5);
        endHHMM = String(appt.expectedEnd_time).slice(0, 5);
      }
    }

    const serviceName =
      row.package_name && row.package_name.length
        ? row.package_name
        : row.services && row.services.length
        ? row.services.join(", ")
        : "Service";

    setSelectedFeedbackId(feedbackId);
    setApptMeta({ dateISO, startHHMM, endHHMM, serviceName });
    setModalOpen(true);
  };

  const onView = async (feedbackId: string) => {
    const base = rows.find((r) => r.feedback_id === feedbackId);
    if (!base) return;

    // Fetch extra fields (rating, admin/customer names, latest responses)
    const [feedbackRes, apptRes] = await Promise.all([
      supabase
        .from("Feedback")
        .select(
          "feedback_id, created_at, rating, customer_response, admin_response, firstName, middleName, lastName, appointment_id"
        )
        .eq("feedback_id", feedbackId)
        .single(),
      base.appointment_id
        ? supabase
            .from("Appointments")
            .select("date, expectedStart_time, expectedEnd_time")
            .eq("appointment_id", base.appointment_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    const f = feedbackRes.data as {
      feedback_id: string;
      created_at: string;
      rating: number | null;
      customer_response: string | null;
      admin_response: string | null;
      firstName: string | null;
      middleName: string | null;
      lastName: string | null;
      appointment_id: string | null;
    } | null;

    const appt = apptRes && "data" in apptRes ? (apptRes.data as any) : null;

    const view: ViewResponseData = {
      feedback_id: feedbackId,
      created_at: f?.created_at ?? base.created_at,
      rating: f?.rating ?? null,
      customer_response: f?.customer_response ?? base.customer_response ?? null,
      admin_response: f?.admin_response ?? null,
      firstName: f?.firstName ?? null,
      middleName: f?.middleName ?? null,
      lastName: f?.lastName ?? null,
      services: base.services,
      package_name: base.package_name,
      appointment: {
        dateISO: appt?.date ?? undefined,
        startHHMM: appt?.expectedStart_time
          ? String(appt.expectedStart_time).slice(0, 5)
          : undefined,
        endHHMM: appt?.expectedEnd_time
          ? String(appt.expectedEnd_time).slice(0, 5)
          : undefined,
      },
    };

    setViewData(view);
    setViewOpen(true);
  };

  // ---------- modal submit ----------
  const handleSubmitFeedback = async (payload: {
    rating: number;
    comment: string;
  }) => {
    if (!selectedFeedbackId) return;
    try {
      setSubmitting(true);

      // Update only if not yet answered (backend guard)
      const { data, error } = await supabase
        .from("Feedback")
        .update({
          rating: payload.rating,
          customer_response: payload.comment || null,
          customer_response_date: new Date().toISOString(),
        })
        .eq("feedback_id", selectedFeedbackId)
        .is("customer_response", null)
        .select("feedback_id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        alert("This feedback was already submitted. Showing the latest state.");
      }

      // Keep the row but mark as responded so the button disables
      setRows((prev) =>
        prev.map((r) =>
          r.feedback_id === selectedFeedbackId
            ? {
                ...r,
                customer_response:
                  r.customer_response ?? (payload.comment || "Submitted"),
              }
            : r
        )
      );

      setModalOpen(false);
      setSelectedFeedbackId(null);
      setApptMeta(null);
    } catch (e: any) {
      alert(e?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4 md:p-6">
      <SubmitFeedback
        unrespondedFeedbackData={rows}
        onRespond={onRespond}
        onView={onView}
      />

      <SubmitFeedbackForm
        open={modalOpen && !!apptMeta}
        onClose={() => {
          setModalOpen(false);
          setSelectedFeedbackId(null);
          setApptMeta(null);
        }}
        submitting={submitting}
        onSubmit={handleSubmitFeedback}
        appointment={{
          dateISO: apptMeta?.dateISO ?? new Date().toISOString().slice(0, 10),
          serviceName: apptMeta?.serviceName ?? "Service",
          startHHMM: apptMeta?.startHHMM ?? "09:00",
          endHHMM: apptMeta?.endHHMM ?? "10:00",
        }}
      />

      <ViewResponseModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        data={viewData}
      />
    </div>
  );
};

export default CustomerFeedback;
