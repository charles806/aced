import type { Metadata } from "next";
import SignupForm from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create your free ACED account to keep notes, subjects and study sessions organized in one quiet place.",
};

export default function SignupPage() {
  return <SignupForm />;
}