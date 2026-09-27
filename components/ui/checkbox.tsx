import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      checked = false,
      indeterminate = false,
      onCheckedChange,
      disabled,
      label,
      description,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className={cn("inline-flex items-start gap-2", className)}>
        <div className="relative flex items-center justify-center pt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "h-4 w-4 rounded-xs border transition-colors duration-fast ease-standard flex items-center justify-center select-none cursor-pointer",
              "border-border bg-surface hover:border-border-active",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
              (checked || indeterminate) && "bg-accent border-accent text-accent-foreground",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            onClick={(e) => {
              if (disabled) return;
              e.preventDefault();
              onCheckedChange?.(!checked);
            }}
          >
            {checked && !indeterminate && <Check className="h-3 w-3 stroke-[2.5]" />}
            {indeterminate && <Minus className="h-3 w-3 stroke-[2.5]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col text-small select-none">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  "font-medium text-text-primary cursor-pointer leading-tight",
                  disabled && "cursor-not-allowed opacity-50"
                )}
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
Checkbox.displayName = "Checkbox";

export { Checkbox };
