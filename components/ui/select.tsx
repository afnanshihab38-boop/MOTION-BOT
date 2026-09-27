import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  options,
  value: controlledValue,
  defaultValue,
  placeholder = "Select an option...",
  onValueChange,
  disabled = false,
  className,
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : uncontrolledValue;

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = React.useCallback(
    (optValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(optValue);
      }
      onValueChange?.(optValue);
      setIsOpen(false);
    },
    [isControlled, onValueChange]
  );

  // Close when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
        const option = options[highlightedIndex];
        if (!option.disabled) {
          handleSelect(option.value);
        }
      } else {
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(options.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    }
  };

  const generatedId = React.useId();
  const listboxId = `${id || generatedId}-listbox`;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-sm border border-border bg-surface px-2.5 text-small text-text-primary transition-colors duration-fast ease-standard",
          "hover:border-border-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isOpen && "border-accent",
          disabled && "cursor-not-allowed opacity-50 bg-surface/50"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-text-muted")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-muted transition-transform duration-fast ease-standard shrink-0 ml-1.5",
            isOpen && "rotate-180 text-text-primary"
          )}
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-border bg-surface-elevated p-1 shadow-elevated focus:outline-none animate-in fade-in zoom-in-95 duration-fast"
        >
          {options.map((option, idx) => {
            const isSelected = option.value === selectedValue;
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  if (!option.disabled) {
                    handleSelect(option.value);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center justify-between rounded-xs px-2 py-1.5 text-small transition-colors duration-instant",
                  isHighlighted && !option.disabled && "bg-surface text-text-primary",
                  isSelected && "text-accent font-medium",
                  option.disabled && "cursor-not-allowed opacity-40 text-text-muted"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-accent shrink-0 ml-2" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
