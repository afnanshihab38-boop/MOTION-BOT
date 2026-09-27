import * as React from "react";
import { NavHeader } from "./nav-header";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "default" | "full" | "narrow";
}

export function AppShell({
  children,
  className,
  maxWidth = "default",
}: AppShellProps) {
  const maxWidthClasses = {
    default: "max-w-7xl",
    full: "max-w-full",
    narrow: "max-w-4xl",
  }[maxWidth];

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary antialiased">
      <NavHeader />
      <main
        className={cn(
          "flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6",
          maxWidthClasses,
          className
        )}
      >
        {children}
      </main>
      <footer className="border-t border-border-subtle bg-surface/50 py-3 text-caption text-text-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>MOTION-BOT Studio Engine</span>
            <span className="font-mono text-text-muted/60">v0.1.0-alpha</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Phase 2.3 — Shell & Navigation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
