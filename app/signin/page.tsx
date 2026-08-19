import type { Metadata } from "next";
import SigninForm from "@/components/SigninForm";

export const metadata: Metadata = {
  title: "Log in | Aced",
  description: "Log in to your Aced account.",
};

export default function SigninPage() {
  return <SigninForm />;
}