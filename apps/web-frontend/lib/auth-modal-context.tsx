"use client";

// Auth modal context — global modal that any component can trigger.
// Used when a guest tries to tip, hire, view wallet, view dashboard,
// or any protected action. Per the spec: don't redirect, show a modal.

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { AuthModal } from "@/components/auth-modal";

interface AuthModalState {
  open: boolean;
  reason: string | null;
  trigger: () => void;
  triggerWithReason: (reason: string) => void;
  close: () => void;
}

const Ctx = createContext<AuthModalState | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const value = useMemo<AuthModalState>(
    () => ({
      open,
      reason,
      trigger: () => {
        setReason(null);
        setOpen(true);
      },
      triggerWithReason: (r: string) => {
        setReason(r);
        setOpen(true);
      },
      close: () => {
        setOpen(false);
        setReason(null);
      },
    }),
    [open, reason]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <AuthModal />
    </Ctx.Provider>
  );
}

export function useAuthModal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuthModal must be used inside AuthModalProvider");
  return v;
}