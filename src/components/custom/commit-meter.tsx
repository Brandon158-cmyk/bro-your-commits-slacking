
import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CommitMeterProps {
  value: number;
  maxValue: number;
  className?: string;
}

const CommitMeter = ({ value, maxValue, className }: CommitMeterProps) => {
  const percentage = Math.min(Math.round((value / maxValue) * 100), 100);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const timeout = setTimeout(() => setProgress(percentage), 500);
    return () => clearTimeout(timeout);
  }, [percentage]);

  // Determine status based on percentage
  const getStatus = () => {
    if (percentage < 30) return "You're Slacking, Bro! 😴";
    if (percentage < 60) return "Barely Keeping Up! 😅";
    if (percentage < 80) return "Not Bad, Not Bad! 👍";
    return "Crushing It! 🔥";
  };

  // Get color based on percentage
  const getColor = () => {
    if (percentage < 30) return "text-ink-red";
    if (percentage < 60) return "text-pencil-light";
    if (percentage < 80) return "text-pencil";
    return "text-ink-green";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <h4 className={cn("font-handwritten text-xl", getColor())}>
          {getStatus()}
        </h4>
        <span className="font-handwritten">{percentage}%</span>
      </div>
      <div className="relative">
        <Progress 
          value={progress} 
          className="h-4 bg-paper border border-pencil-light" 
        />
        <div 
          className="absolute -bottom-6 rotate-3 transition-all duration-300 font-handwritten text-xs"
          style={{ left: `${Math.max(progress - 10, 0)}%` }}
        >
          {progress < 30 && "Your ops are catching up! 👀"}
          {progress >= 30 && progress < 60 && "Keep pushing! 💪"}
          {progress >= 60 && progress < 80 && "Good work! 👌"}
          {progress >= 80 && "Legendary! 🏆"}
        </div>
      </div>
    </div>
  );
};

export { CommitMeter };
