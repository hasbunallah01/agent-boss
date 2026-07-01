"use client";

import { useEffect, useState } from "react";

/**
 * Renders children only on the client. Useful for guarding components
 * that depend on browser APIs (clipboard, window) or auth context.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}