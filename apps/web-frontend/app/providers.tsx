"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModalProvider } from "@/lib/auth-modal-context";
import { SWRProvider } from "@/lib/swr-config";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <AuthProvider>
        <AuthModalProvider>{children}</AuthModalProvider>
      </AuthProvider>
    </SWRProvider>
  );
}