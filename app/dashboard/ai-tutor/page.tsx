"use client";

import { Sparkles } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function AITutorPage() {
  return (
    <PlaceholderPage
      icon={Sparkles}
      title="No AI study history"
      description="Ask the AI Tutor a question about your notes and your conversations will appear here."
      ctaLabel="Back to dashboard"
    />
  );
}
