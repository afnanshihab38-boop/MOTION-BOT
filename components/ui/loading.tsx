import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Spinner({
  size = "md",
  label = "Loading...",
  className,
  ...props
}: SpinnerProps) {
  const sizeMap = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  };

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center gap-2", className)}
      {...props}
    >
      <Loader2
        className={cn(
          "animate-spin text-accent shrink-0",
          sizeMap[size]
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-sm bg-surface-elevated/70 border border-border-subtle/50",
        className
      )}
      {...props}
    />
  );
}
