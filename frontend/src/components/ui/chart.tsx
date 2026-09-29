"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { config?: Record<string, any> }
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("w-full", className)} {...props}>
    {children}
  </div>
));
ChartContainer.displayName = "ChartContainer";

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { active?: any; payload?: any; label?: any }
>(({ active, payload, label, className }, ref) => {
  if (active && payload && payload.length) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-popover p-2 shadow-md",
          className
        )}
      >
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
});
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltipContent };
