
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

// GitHub OAuth configuration
const CLIENT_ID = "YOUR_GITHUB_CLIENT_ID"; // Replace with your GitHub OAuth App client ID
const REDIRECT_URI = window.location.origin + "/";
const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;

// Function to handle GitHub OAuth login
export const loginWithGitHub = () => {
  // Redirect to GitHub for authentication
  window.location.href = GITHUB_AUTH_URL;
};

// Function to extract the code from URL after GitHub redirects back
export const handleAuthCallback = async (): Promise<string | null> => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) return null;
  
  // Clear the URL to remove the code
  window.history.replaceState({}, document.title, window.location.pathname);
  
  try {
    // In a real implementation, you would exchange this code for an access token
    // This typically requires a backend service due to CORS limitations
    // For this demo, we'll simulate token exchange with localStorage
    const token = `github_${code}`;
    localStorage.setItem('github_token', token);
    return token;
  } catch (error) {
    console.error("Error during GitHub authorization:", error);
    return null;
  }
};

// Function to check if user is authenticated
export const checkAuth = (): string | null => {
  return localStorage.getItem("github_token");
};

// Function to logout user
export const logout = () => {
  localStorage.removeItem("github_token");
};

// Function to fetch GitHub stats
export const fetchGitHubStats = async (token: string): Promise<GitHubStats> => {
  try {
    // Note: In a real implementation, you would use this token to make
    // authenticated requests to the GitHub API.
    // Without a backend to handle the OAuth flow, we're simulating API calls
    
    // For a complete implementation, you would need:
    // 1. A backend service to exchange the code for an access token
    // 2. Server-side endpoints to make authenticated GitHub API requests
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate a date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Generate some semi-realistic data based on the token
    // In a real implementation, this would be real data from GitHub API
    const tokenHash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomFactor = tokenHash % 100 / 100;
    
    const totalCommits = Math.floor(randomFactor * 500) + 50;
    const recentCommits = Math.floor(randomFactor * 30);
    const streakDays = Math.floor(randomFactor * 14);
    
    return {
      totalCommits,
      recentCommits,
      streakDays,
      lastCommitDate: new Date().toISOString(),
      topRepos: [
        { name: "awesome-project", commits: Math.floor(randomFactor * 100) + 10 },
        { name: "personal-website", commits: Math.floor(randomFactor * 50) + 5 },
        { name: "side-project", commits: Math.floor(randomFactor * 30) + 2 },
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
