import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      onValueChange,
      disabled = false,
      name,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (nextValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
      [isControlled, onValueChange]
    );

    return (
      <RadioGroupContext.Provider
        value={{ value, onValueChange: handleValueChange, disabled, name }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, label, description, disabled: itemDisabled, id, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const generatedId = React.useId();
    const itemId = id || generatedId;

    const isChecked = context?.value === value;
    const disabled = itemDisabled || context?.disabled;

    const handleClick = () => {
      if (disabled) return;
      context?.onValueChange?.(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div className={cn("inline-flex items-start gap-2.5", className)}>
        <button
          ref={ref}
          id={itemId}
          type="button"
          role="radio"
          aria-checked={isChecked}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent transition-colors duration-fast ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "hover:border-border-active",
            isChecked && "border-accent",
            disabled && "cursor-not-allowed opacity-50"
          )}
          {...props}
        >
          {isChecked && (
            <span className="h-2 w-2 rounded-full bg-accent animate-in fade-in zoom-in-50 duration-fast" />
          )}
        </button>
        {(label || description) && (
          <div className="flex flex-col text-small select-none">
            {label && (
              <label
                htmlFor={itemId}
                className={cn(
                  "font-medium text-text-primary cursor-pointer leading-tight",
                  disabled && "cursor-not-allowed opacity-50"
                )}
                onClick={handleClick}
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
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
