"use client";

import { Suspense } from "react";
import { AuthFlow } from "@/components/auth-flow";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="container-app py-16">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <AuthFlow />
      </Suspense>
    </div>
  );
}