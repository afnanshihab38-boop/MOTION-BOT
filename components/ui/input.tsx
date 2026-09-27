import * as React from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", prefixNode, suffixNode, hasError = false, disabled, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center w-full h-8 rounded-sm border bg-surface px-2.5 text-small transition-colors duration-fast ease-standard",
          hasError
            ? "border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error"
            : "border-border hover:border-border-active focus-within:border-accent focus-within:ring-1 focus-within:ring-accent",
          disabled && "opacity-50 cursor-not-allowed bg-surface/50 pointer-events-none",
          className
        )}
      >
        {prefixNode && (
          <span className="mr-2 text-text-muted flex items-center select-none shrink-0">
            {prefixNode}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className="w-full h-full bg-transparent text-text-primary placeholder:text-text-muted text-small focus:outline-none disabled:cursor-not-allowed"
          {...props}
        />
        {suffixNode && (
          <span className="ml-2 text-text-muted flex items-center select-none shrink-0">
            {suffixNode}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SearchInputProps extends Omit<InputProps, "prefixNode" | "type"> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, ...props }, ref) => {
    const hasValue = Boolean(value);

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        prefixNode={<Search className="h-3.5 w-3.5" />}
        suffixNode={
          hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-text-muted hover:text-text-primary p-0.5 rounded-xs transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          ) : undefined
        }
        className={className}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";

export interface NumberInputProps
  extends Omit<InputProps, "type" | "prefixNode" | "suffixNode"> {
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  onValueChange?: (value: number) => void;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      step = 1,
      min,
      max,
      unit,
      disabled,
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const handleStep = (direction: 1 | -1) => {
      if (disabled) return;
      const current = typeof value === "number" ? value : parseFloat(String(value)) || 0;
      let next = current + direction * step;
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;
      if (onValueChange) onValueChange(next);
    };

    return (
      <div
        className={cn(
          "relative flex items-center w-full h-8 rounded-sm border border-border bg-surface pl-2.5 pr-1 text-small transition-colors duration-fast ease-standard hover:border-border-active focus-within:border-accent focus-within:ring-1 focus-within:ring-accent",
          disabled && "opacity-50 cursor-not-allowed bg-surface/50 pointer-events-none",
          className
        )}
      >
        <input
          ref={ref}
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={onChange}
          className="w-full h-full bg-transparent text-text-primary font-mono text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
          {...props}
        />
        {unit && (
          <span className="text-[10px] text-text-muted font-mono select-none px-1 uppercase">
            {unit}
          </span>
        )}
        <div className="flex flex-col ml-1 border-l border-border-subtle pl-0.5">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => handleStep(1)}
            className="text-text-muted hover:text-text-primary p-0.5 hover:bg-surface-elevated rounded-xs transition-colors"
            aria-label="Increment"
          >
            <ChevronUp className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => handleStep(-1)}
            className="text-text-muted hover:text-text-primary p-0.5 hover:bg-surface-elevated rounded-xs transition-colors"
            aria-label="Decrement"
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { Input, SearchInput, NumberInput };
