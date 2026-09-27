import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked = false,
      onCheckedChange,
      disabled = false,
      label,
      description,
      id,
      onClick,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e);
      onCheckedChange?.(!checked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!disabled) {
          onCheckedChange?.(!checked);
        }
      }
    };

    return (
      <div className={cn("inline-flex items-center gap-2.5", className)}>
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-fast ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            checked ? "bg-accent" : "bg-surface-elevated border-border",
            disabled && "cursor-not-allowed opacity-50"
          )}
          {...props}
        >
          <span
            className={cn(
              "pointer-events-none block h-4 w-4 rounded-full bg-text-primary shadow-subtle ring-0 transition-transform duration-fast ease-standard",
              checked ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex flex-col text-small select-none">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  "font-medium text-text-primary cursor-pointer leading-tight",
                  disabled && "cursor-not-allowed opacity-50"
                )}
                onClick={() => !disabled && onCheckedChange?.(!checked)}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-text-muted text-caption mt-0.5 leading-tight">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
