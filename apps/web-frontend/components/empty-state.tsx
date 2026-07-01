import { cn } from "@/lib/cn";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-bg-surface/50",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center text-text-dim mb-5">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-md mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}