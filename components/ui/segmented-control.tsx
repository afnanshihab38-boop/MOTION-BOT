import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export type SegmentOption = SegmentedOption;

export function SegmentedControl({
  options,
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  size = "md",
}: SegmentedControlProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue || options[0]?.value || ""
  );
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setUncontrolledValue(val);
    }
    onValueChange?.(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = options.findIndex((opt) => opt.value === currentValue);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % options.length;
      const nextOpt = options[nextIndex];
      if (nextOpt && !nextOpt.disabled) handleSelect(nextOpt.value);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      const prevOpt = options[prevIndex];
      if (prevOpt && !prevOpt.disabled) handleSelect(prevOpt.value);
    }
  };

  return (
    <div
      role="radiogroup"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center rounded-sm bg-surface p-0.5 border border-border select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === currentValue;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => !isDisabled && handleSelect(option.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xs font-medium text-caption transition-colors duration-fast ease-standard",
              size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
              isSelected
                ? "bg-surface-elevated text-text-primary shadow-subtle border border-border-active"
                : "text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            {option.label && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
