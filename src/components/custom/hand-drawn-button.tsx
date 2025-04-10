
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type ButtonProps } from "@/components/ui/button";

const HandDrawnButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    const randomRotation = React.useMemo(() => {
      return Math.random() * 1 - 0.5;
    }, []);

    return (
      <Button
        className={cn(
          "relative font-handwritten border-2 border-pencil-dark bg-paper-light hover:bg-paper text-pencil-dark transition-all duration-300",
          "before:absolute before:inset-0 before:border-2 before:border-pencil-light before:rounded-md before:-rotate-1 before:-z-10",
          "transform hover:scale-105 active:scale-95 active:rotate-1",
          `rotate-[${randomRotation}deg]`,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

HandDrawnButton.displayName = "HandDrawnButton";

export { HandDrawnButton };
