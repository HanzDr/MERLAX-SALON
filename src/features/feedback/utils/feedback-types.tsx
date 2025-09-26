import type { feedbackResponseData } from "@/validation/FeedbackSchema";

export type FeedbackCategory =
  | "Positive"
  | "Negative"
  | "Suggestion"
  | "Neutral";

export interface FeedbackCardProps {
  feedbackId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  date: string; // ISO or display string
  description: string;
  category: FeedbackCategory;
  rating: number;

  // UI handlers used by the card component
  onCategorize: () => void;
  onRespond: () => void;
}

// For creating a feedback (no ID/handlers yet)
export interface Feedback
  extends Omit<
    FeedbackCardProps,
    "feedbackId" | "onCategorize" | "onRespond"
  > {}

export type FeedbackFormProps = {
  feedbackId: string;
  onClose: () => void;
  onSave: (data: feedbackResponseData) => Promise<void> | void; // sends { comment?: string | null }
};

// Discriminated union for updater
export type UpdateCategory = {
  kind: "categorize";
  feedbackId: string;
  category: FeedbackCategory;
};

export type UpdateRespond = {
  kind: "respond";
  feedbackId: string;
  comment: string; // normalized to string by the page handler
};

export type UpdatePayload = UpdateCategory | UpdateRespond;
