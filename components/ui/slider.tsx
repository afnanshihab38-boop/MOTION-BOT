import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  label?: string;
  unit?: string;
  showValue?: boolean;
  className?: string;
  id?: string;
}

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  disabled = false,
  label,
  unit,
  showValue = false,
  className,
  id,
}: SliderProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const percentage = Math.min(
    100,
    Math.max(0, ((currentValue - min) / (max - min)) * 100)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    if (!isControlled) {
      setUncontrolledValue(nextVal);
    }
    onValueChange?.(nextVal);
  };

  return (
    <div className={cn("w-full flex flex-col gap-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-caption select-none">
          {label && <span className="font-medium text-text-secondary">{label}</span>}
          {showValue && (
            <span className="font-mono text-text-muted">
              {currentValue}
              {unit}
            </span>
          )}
        </div>
      )}
      <div className="relative flex items-center w-full h-4 select-none touch-none">
        {/* Track background */}
        <div className="relative w-full h-1 rounded-full bg-surface-elevated border border-border-subtle overflow-hidden">
          {/* Active fill */}
          <div
            className="absolute left-0 top-0 h-full bg-accent transition-all duration-instant"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Hidden native input for accessible keyboard & touch control */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed",
            "focus-visible:opacity-100 focus-visible:accent-accent focus-visible:outline-none"
          )}
        />

        {/* Visual thumb */}
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border border-border bg-text-primary shadow-subtle transition-transform duration-fast ease-standard",
            disabled && "bg-text-muted"
          )}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
