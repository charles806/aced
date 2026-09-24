import type { Metadata } from "next";
import SigninForm from "@/components/SigninForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to ACED and pick up where you left off.",
};

export default function SigninPage() {
  return <SigninForm />;
}