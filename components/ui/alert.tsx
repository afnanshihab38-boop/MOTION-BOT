import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-sm border p-3 flex items-start gap-2.5 text-small [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-surface text-text-primary border-border [&>svg]:text-accent",
        destructive:
          "bg-destructive/10 text-destructive-foreground border-destructive/30 [&>svg]:text-error",
        success:
          "bg-success/10 text-text-primary border-success/30 [&>svg]:text-success",
        warning:
          "bg-warning/10 text-text-primary border-warning/30 [&>svg]:text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", icon, children, ...props }, ref) => {
    const defaultIcons = {
      default: <Info className="h-4 w-4 mt-0.5" />,
      destructive: <AlertCircle className="h-4 w-4 mt-0.5" />,
      success: <CheckCircle2 className="h-4 w-4 mt-0.5" />,
      warning: <AlertTriangle className="h-4 w-4 mt-0.5" />,
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {icon ?? defaultIcons[variant || "default"]}
        <div className="flex-1 space-y-0.5">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-medium text-text-primary leading-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-caption text-text-secondary leading-normal", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
