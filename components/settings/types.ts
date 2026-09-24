export type NotificationPreferenceKey =
  | "studyReminders"
  | "productUpdates"
  | "emailNotifications";

export type UserProfile = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationSettings = {
  studyReminders: boolean;
  productUpdates: boolean;
  emailNotifications: boolean;
};