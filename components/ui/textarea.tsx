import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError = false, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          "w-full rounded-sm border bg-surface p-2.5 text-small text-text-primary placeholder:text-text-muted transition-colors duration-fast ease-standard focus:outline-none resize-y min-h-[72px]",
          hasError
            ? "border-error focus:border-error focus:ring-1 focus:ring-error"
            : "border-border hover:border-border-active focus:border-accent focus:ring-1 focus:ring-accent",
          disabled && "opacity-50 cursor-not-allowed bg-surface/50 pointer-events-none",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
