import * as React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastProps) {
  const { id, type = "info", title, description, duration = 4000 } = toast;

  React.useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const icons = {
    info: <Info className="h-4 w-4 text-accent shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-success shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-error shrink-0" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex w-80 items-start gap-2.5 rounded-sm border border-border bg-surface-elevated p-3 shadow-elevated transition-all duration-normal ease-standard animate-in fade-in slide-in-from-bottom-2",
        "hover:border-border-active"
      )}
    >
      <div className="pt-0.5">{icons[type]}</div>
      <div className="flex-1 select-none">
        <h4 className="text-small font-semibold text-text-primary leading-tight">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-caption text-text-secondary leading-snug">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="text-text-muted hover:text-text-primary p-0.5 rounded-xs transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
