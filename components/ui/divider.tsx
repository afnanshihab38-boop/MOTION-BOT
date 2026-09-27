import * as React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  subtle?: boolean;
}

export function Divider({
  orientation = "horizontal",
  subtle = true,
  className,
  ...props
}: DividerProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        subtle ? "bg-border-subtle" : "bg-border",
        isHorizontal ? "h-px w-full my-2" : "w-px h-full min-h-[16px] mx-2 self-stretch inline-block",
        className
      )}
      {...props}
    />
  );
}
