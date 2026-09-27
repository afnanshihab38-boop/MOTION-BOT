"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for development observability
    console.error("Application error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-destructive">
          An unexpected error occurred
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "A runtime error was caught by the foundation error boundary."}
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-md border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
