import * as React from "react";
import { cn } from "@/lib/utils";

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  shortcut?: string;
  destructive?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "start",
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }[align];

  return (
    <div ref={containerRef} className="relative inline-flex">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          role="menu"
          onClick={() => setIsOpen(false)}
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[160px] rounded-sm border border-border bg-surface-elevated p-1 shadow-elevated animate-in fade-in zoom-in-95 duration-fast",
            alignClasses,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  icon,
  shortcut,
  destructive = false,
  disabled,
  className,
  children,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-xs px-2 py-1.5 text-small text-left transition-colors duration-instant select-none",
        destructive
          ? "text-error hover:bg-destructive/10"
          : "text-text-primary hover:bg-surface",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate">
        {icon && <span className="text-text-secondary shrink-0">{icon}</span>}
        <span className="truncate">{children}</span>
      </div>
      {shortcut && (
        <span className="text-[10px] font-mono text-text-muted uppercase ml-2">
          {shortcut}
        </span>
      )}
    </button>
  );
}

export function DropdownMenuSeparator({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("my-1 h-px bg-border-subtle", className)}
    />
  );
}

export function DropdownMenuLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider select-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
