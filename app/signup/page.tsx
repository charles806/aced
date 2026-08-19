import type { Metadata } from "next";
import SignupForm from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Sign up | Aced",
  description:
    "Create your Aced account to keep every note, flashcard, and revision plan in one quiet, organized place.",
};

export default function SignupPage() {
  return <SignupForm />;
}