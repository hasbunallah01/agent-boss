import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

/**
 * The brand mark. Uses the founder's MA monogram (gold hooded figure)
 * as the icon + "Agent Boss" as the wordmark. The MA monogram is the
 * small icon; "Agent Boss" is the product name.
 */
export function Logo({ size = 32, className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/ma-icon.jpeg"
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