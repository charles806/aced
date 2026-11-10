"use client";

import { DataCacheProvider } from "@/app/lib/data-cache";
import type { ReactNode } from "react";

export function DataCacheProviderWrapper({ children }: { children: ReactNode }) {
  return <DataCacheProvider>{children}</DataCacheProvider>;
}