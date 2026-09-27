import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-btn font-medium transition-colors duration-fast ease-standard select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 shadow-subtle border border-accent/20",
        secondary:
          "bg-surface-elevated text-text-primary border border-border hover:bg-surface hover:border-border-active active:bg-surface/80 shadow-subtle",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-surface-elevated active:bg-surface border border-transparent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-subtle border border-destructive/20",
        outline:
          "border border-border text-text-primary hover:bg-surface-elevated hover:border-border-active active:bg-surface shadow-subtle",
      },
      size: {
        sm: "h-7 px-2.5 text-xs rounded-sm gap-1.5",
        md: "h-8 px-3 text-btn rounded-sm gap-2",
        lg: "h-9 px-4 text-sm rounded-md gap-2.5",
        "icon-sm": "h-7 w-7 p-0 rounded-sm",
        icon: "h-8 w-8 p-0 rounded-sm",
        "icon-lg": "h-9 w-9 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
