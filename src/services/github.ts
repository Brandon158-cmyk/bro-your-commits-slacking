
// This service handles GitHub API interactions

type Commit = {
  sha: string;
  date: string;
  message: string;
  url: string;
};

type GitHubStats = {
  totalCommits: number;
  recentCommits: number;
  streakDays: number;
  lastCommitDate: string;
  topRepos: { name: string; commits: number }[];
  recentActivity: Commit[];
};

export const fetchGitHubStats = async (token: string): Promise<GitHubStats> => {
  try {
    // In a real implementation, we'd make actual GitHub API calls
    // For now, this is a mock implementation
    
    // This would be replaced with actual GitHub API calls
    console.log("Fetching GitHub stats with token:", token);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, return mock data
    return {
      totalCommits: Math.floor(Math.random() * 500) + 50,
      recentCommits: Math.floor(Math.random() * 30),
      streakDays: Math.floor(Math.random() * 14),
      lastCommitDate: new Date().toISOString(),
      topRepos: [
        { name: "awesome-project", commits: Math.floor(Math.random() * 100) + 10 },
        { name: "personal-website", commits: Math.floor(Math.random() * 50) + 5 },
        { name: "side-project", commits: Math.floor(Math.random() * 30) + 2 },
      ],
      recentActivity: Array(5).fill(null).map((_, i) => ({
        sha: `abc${i}def${Math.floor(Math.random() * 1000)}`,
        date: new Date(Date.now() - i * 86400000).toISOString(),
        message: [
          "Fix critical bug in login flow",
          "Update README with new instructions",
          "Add new feature for premium users",
          "Refactor code for better performance",
          "Merge pull request from teammate"
        ][Math.floor(Math.random() * 5)],
        url: `https://github.com/user/repo/commit/abc${i}def${Math.floor(Math.random() * 1000)}`,
      })),
    };
  } catch (error) {
    console.error("Error fetching GitHub stats:", error);
    throw error;
  }
};

// In a real implementation, this would redirect to GitHub OAuth
export const loginWithGitHub = () => {
  console.log("Redirecting to GitHub for authentication...");
  // This is a mock implementation
  // In production, we would redirect to GitHub OAuth flow
  
  // For demo purposes, we'll just use a mock token
  const mockToken = "mock_github_token_" + Math.random().toString(36).substring(2);
  localStorage.setItem("github_token", mockToken);
  return mockToken;
};

export const checkAuth = (): string | null => {
  return localStorage.getItem("github_token");
};

export const logout = () => {
  localStorage.removeItem("github_token");
};
