import * as React from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export function Panel({
  className,
  bordered = true,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-surface overflow-hidden",
        bordered && "border border-border rounded-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelHeader({
  title,
  icon,
  actions,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-8 items-center justify-between px-3 border-b border-border bg-surface-elevated/40 select-none shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate">
        {icon && <span className="text-text-secondary shrink-0">{icon}</span>}
        {title && (
          <span className="text-caption font-semibold text-text-primary tracking-tight truncate">
            {title}
          </span>
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  );
}

export function PanelContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 p-3 overflow-auto", className)} {...props}>
      {children}
    </div>
  );
}

export function PanelFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-8 items-center justify-between px-3 border-t border-border bg-surface-elevated/20 text-caption text-text-muted shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
