
import React from "react";
import { useNavigate } from "react-router-dom";
import { Github } from "lucide-react";
import { HandDrawnButton } from "@/components/custom/hand-drawn-button";
import { HandDrawnCard } from "@/components/custom/hand-drawn-card";
import { useGitHub } from "@/contexts/GitHubContext";

const Index = () => {
  const { isAuthenticated, login } = useGitHub();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <HandDrawnCard variant="notebook" className="mb-8">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-5xl font-handwritten mb-4 text-pencil-dark">
              <span className="block">Bro, Your Commits</span>
              <span className="block text-ink-red animate-wobble inline-block">Slacking?</span>
            </h1>
            
            <p className="mb-8 text-xl">
              Let's check if you're crushing your GitHub game or if your ops are catching up! 🔍
            </p>
            
            <HandDrawnButton 
              className="text-xl flex items-center gap-2" 
              onClick={login}
            >
              <Github className="w-5 h-5" />
              Login with GitHub
            </HandDrawnButton>
            
            <div className="mt-4 text-pencil text-sm">
              (This is just a demo, no real GitHub login required)
            </div>
          </div>
        </HandDrawnCard>
        
        <HandDrawnCard className="text-center">
          <h2 className="text-2xl font-handwritten mb-2">What's this all about?</h2>
          <p className="mb-4">
            This playful app checks your GitHub commit activity and tells you if you're 
            crushing it or slacking on your projects.
          </p>
          <p>
            Get a reality check on your coding habits with some friendly banter! 
            No judgment, just motivation to keep pushing! 💪
          </p>
        </HandDrawnCard>
      </div>
    </div>
  );
};

export default Index;
