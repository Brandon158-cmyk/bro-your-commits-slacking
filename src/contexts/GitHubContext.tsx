
import React, { createContext, useContext, useState, useEffect } from "react";
import { checkAuth, loginWithGitHub, logout, fetchGitHubStats } from "../services/github";
import { useToast } from "@/components/ui/use-toast";

type GitHubContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  githubStats: any;
  login: () => void;
  logout: () => void;
  refreshStats: () => Promise<void>;
};

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [githubStats, setGithubStats] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedToken = checkAuth();
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      refreshStats();
    }
  }, [token]);

  const refreshStats = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const stats = await fetchGitHubStats(token);
      setGithubStats(stats);
    } catch (error) {
      console.error("Failed to fetch GitHub stats:", error);
      toast({
        title: "Oops! Something went wrong",
        description: "Couldn't fetch your GitHub stats, bro. Try again later!",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    const newToken = loginWithGitHub();
    setToken(newToken);
    setIsAuthenticated(true);
    toast({
      title: "Yo! You're in!",
      description: "Successfully connected to GitHub! Let's check your commit game!",
    });
  };

  const handleLogout = () => {
    logout();
    setToken(null);
    setIsAuthenticated(false);
    setGithubStats(null);
    toast({
      title: "Catch ya later!",
      description: "You've been logged out. Come back soon!",
    });
  };

  return (
    <GitHubContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        githubStats,
        login,
        logout: handleLogout,
        refreshStats,
      }}
    >
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const context = useContext(GitHubContext);
  if (context === undefined) {
    throw new Error("useGitHub must be used within a GitHubProvider");
  }
  return context;
};
