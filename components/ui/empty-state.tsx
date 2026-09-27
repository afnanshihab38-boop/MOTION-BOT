import * as React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-sm border border-dashed border-border bg-surface/40 select-none",
        className
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface-elevated border border-border text-text-secondary mb-3">
        {icon ?? <FolderOpen className="h-5 w-5" />}
      </div>
      <h4 className="text-small font-semibold text-text-primary leading-tight">
        {title}
      </h4>
      {description && (
        <p className="mt-1 text-caption text-text-muted max-w-xs leading-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
