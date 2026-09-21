"use client";

import { CalendarClock } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function UpcomingPage() {
  return (
    <PlaceholderPage
      icon={CalendarClock}
      title="Nothing scheduled"
      description="Upcoming deadlines and study sessions will appear here once the calendar is wired up."
      ctaLabel="Back to dashboard"
    />
  );
}
