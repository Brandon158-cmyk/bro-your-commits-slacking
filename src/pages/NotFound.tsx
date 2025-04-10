
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HandDrawnButton } from "@/components/custom/hand-drawn-button";
import { HandDrawnCard } from "@/components/custom/hand-drawn-card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <HandDrawnCard variant="notebook" className="max-w-md w-full text-center">
        <h1 className="text-6xl font-handwritten mb-4 text-ink-red">404</h1>
        <p className="text-xl mb-6">Bro, you're lost! This page doesn't exist!</p>
        <HandDrawnButton asChild>
          <a href="/">Head Back Home</a>
        </HandDrawnButton>
      </HandDrawnCard>
    </div>
  );
};

export default NotFound;
