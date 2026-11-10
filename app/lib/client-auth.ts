"use client";

import { logout as serverLogout } from "@/app/actions/auth";
import { clearStudyTimerStorage } from "@/app/lib/study-timer-storage";
import { useRouter } from "next/navigation";
import { dispatchAuthChange } from "@/app/lib/data-cache";

export function useClientLogout() {
  const router = useRouter();

  return async function clientLogout() {
    // Clear study timer storage
    clearStudyTimerStorage();

    // Call server logout action
    await serverLogout();

    // Dispatch auth change event to clear all client caches
    dispatchAuthChange();

    // Redirect to sign in
    router.push("/signin");
  };
}