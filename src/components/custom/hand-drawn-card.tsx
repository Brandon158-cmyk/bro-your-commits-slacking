
import * as React from "react";
import { cn } from "@/lib/utils";

interface HandDrawnCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "notebook";
}

const HandDrawnCard = React.forwardRef<HTMLDivElement, HandDrawnCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const randomSkew = React.useMemo(() => {
      return Math.random() * 1 - 0.5;
    }, []);

    return (
      <div
        className={cn(
          "relative rounded-md bg-paper-light border-2 border-pencil-dark p-6 overflow-hidden",
          "before:absolute before:inset-0 before:border-2 before:border-pencil-light before:rounded-md before:rotate-1 before:-z-10",
          "shadow-[2px_3px_0px_rgba(0,0,0,0.1)]",
          variant === "notebook" && "notebook-paper",
          `transform skew-x-[${randomSkew}deg]`,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

HandDrawnCard.displayName = "HandDrawnCard";

export { HandDrawnCard };
