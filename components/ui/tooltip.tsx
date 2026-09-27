import * as React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  content,
  shortcut,
  side = "top",
  children,
  delayDuration = 150,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayDuration);
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }[side];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 flex items-center gap-1.5 whitespace-nowrap rounded-xs border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium text-text-primary shadow-elevated animate-in fade-in zoom-in-95 duration-fast",
            positionClasses,
            className
          )}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="rounded-xs bg-surface px-1 py-0.2 font-mono text-[10px] text-text-muted border border-border-subtle uppercase">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
}
