import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

/**
 * The brand mark. Uses the Agent Boss logo image (the electric purple/teal
 * "PAZZERA-style" wordmark adapted for Agent Boss). For the founder's
 * personal monogram, see FounderMark.
 */
export function Logo({ size = 32, className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/agent-boss-logo.jpg"
        alt="Agent Boss"
        width={size}
        height={size}
        className={cn(
          "rounded-md shrink-0",
          "ring-1 ring-primary/30 shadow-glow-sm"
        )}
        priority
      />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-base tracking-tight text-text">
            Agent<span className="text-primary">Boss</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim mt-0.5 hidden sm:block">
            AI · Arc · Circle
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The founder's personal monogram (gold hooded figure). Use ONLY in the
 * "Built by" / founder-credit section of the footer. Never use as the
 * product brand.
 */
export function FounderMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/ma-icon.jpeg"
      alt="Mutolib Allyullah"
      width={size}
      height={size}
      className={cn(
        "rounded-full shrink-0 ring-1 ring-gold/30",
        className
      )}
    />
  );
}