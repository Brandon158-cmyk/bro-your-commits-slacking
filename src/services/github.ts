import { Octokit } from 'octokit';

// This service handles GitHub API interactions using Octokit

export type Commit = {
	sha: string;
	date: string;
	message: string;
	url: string;
};

export type GitHubStats = {
	totalCommits: number;
	recentCommits: number;
	streakDays: number;
	lastCommitDate: string;
	topRepos: { name: string; commits: number }[];
	recentActivity: Commit[];
};

// GitHub OAuth configuration
const CLIENT_ID = 'Iv23liQroThNOvKnNBzj'; // Replace with your GitHub OAuth App client ID
const REDIRECT_URI = 'http://localhost:8080/';
const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo,user`;

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
		console.error('Error during GitHub authorization:', error);
		return null;
	}
};

// Function to check if user is authenticated
export const checkAuth = (): string | null => {
	return localStorage.getItem('github_token');
};

// Function to logout user
export const logout = () => {
	localStorage.removeItem('github_token');
};

// Function to calculate commit streaks
const calculateStreak = (commits: any[]): number => {
	if (!commits.length) return 0;

	// Sort commits by date (newest first)
	const sortedDates = commits
		.map((commit) => new Date(commit.commit.author.date))
		.sort((a, b) => b.getTime() - a.getTime());

	// Calculate current streak
	let streakDays = 1;
	let currentDate = new Date(sortedDates[0]);
	currentDate.setHours(0, 0, 0, 0);

	for (let i = 1; i < sortedDates.length; i++) {
		const prevDate = new Date(sortedDates[i]);
		prevDate.setHours(0, 0, 0, 0);

		// Check if dates are consecutive
		const diffTime = currentDate.getTime() - prevDate.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 1) {
			streakDays++;
			currentDate = prevDate;
		} else if (diffDays > 1) {
			break;
		}
	}

	return streakDays;
};

// Function to fetch GitHub stats using Octokit
export const fetchGitHubStats = async (token: string): Promise<GitHubStats> => {
	try {
		// For demo purposes, we're using a simulated token
		// In a real app with backend, this would be a real GitHub token

		// Check if token starts with "github_" prefix (our simulated token)
		if (token.startsWith('github_')) {
			// Use a simulated response for demo purposes
			console.log(
				"Using simulated GitHub data since we don't have a real token"
			);
			return generateSimulatedStats();
		}

		// Initialize Octokit with the token
		const octokit = new Octokit({ auth: token });

		// Get user information
		const { data: userData } = await octokit.request('GET /user');

		// Get user's repositories
		const { data: repos } = await octokit.request('GET /user/repos', {
			sort: 'pushed',
			per_page: 100,
		});

		// Get recent commits from all repos
		let allCommits: any[] = [];
		let topRepos: { name: string; commits: number }[] = [];

		// We'll limit to processing 5 most recently updated repos to avoid rate limits
		const recentRepos = repos.slice(0, 5);

		for (const repo of recentRepos) {
			try {
				const { data: repoCommits } = await octokit.request(
					'GET /repos/{owner}/{repo}/commits',
					{
						owner: userData.login,
						repo: repo.name,
						author: userData.login,
						per_page: 100,
					}
				);

				allCommits = [...allCommits, ...repoCommits];

				if (repoCommits.length > 0) {
					topRepos.push({
						name: repo.name,
						commits: repoCommits.length,
					});
				}
			} catch (error) {
				console.error(`Error fetching commits for ${repo.name}:`, error);
			}
		}

		// Sort top repos by number of commits
		topRepos.sort((a, b) => b.commits - a.commits).slice(0, 3);

		// Filter recent commits (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const recentCommits = allCommits.filter((commit) => {
			const commitDate = new Date(commit.commit.author.date);
			return commitDate > thirtyDaysAgo;
		});

		// Format recent activity
		const recentActivity: Commit[] = recentCommits
			.slice(0, 5)
			.map((commit) => ({
				sha: commit.sha,
				date: commit.commit.author.date,
				message: commit.commit.message,
				url: commit.html_url,
			}));

		// Calculate streak
		const streakDays = calculateStreak(allCommits);

		// Get last commit date
		const lastCommitDate =
			allCommits.length > 0
				? allCommits[0].commit.author.date
				: new Date().toISOString();

		return {
			totalCommits: allCommits.length,
			recentCommits: recentCommits.length,
			streakDays,
			lastCommitDate,
			topRepos: topRepos.slice(0, 3),
			recentActivity,
		};
	} catch (error) {
		console.error('Error fetching GitHub stats:', error);
		// If real API call fails, fall back to simulated data
		return generateSimulatedStats();
	}
};

// Generate simulated stats for demo purposes
const generateSimulatedStats = (): GitHubStats => {
	// Generate some semi-realistic data
	const randomFactor = Math.random();

	const totalCommits = Math.floor(randomFactor * 500) + 50;
	const recentCommits = Math.floor(randomFactor * 30);
	const streakDays = Math.floor(randomFactor * 14);

	return {
		totalCommits,
		recentCommits,
		streakDays,
		lastCommitDate: new Date().toISOString(),
		topRepos: [
			{ name: 'awesome-project', commits: Math.floor(randomFactor * 100) + 10 },
			{ name: 'personal-website', commits: Math.floor(randomFactor * 50) + 5 },
			{ name: 'side-project', commits: Math.floor(randomFactor * 30) + 2 },
		],
		recentActivity: Array(5)
			.fill(null)
			.map((_, i) => ({
				sha: `abc${i}def${Math.floor(Math.random() * 1000)}`,
				date: new Date(Date.now() - i * 86400000).toISOString(),
				message: [
					'Fix critical bug in login flow',
					'Update README with new instructions',
					'Add new feature for premium users',
					'Refactor code for better performance',
					'Merge pull request from teammate',
				][Math.floor(Math.random() * 5)],
				url: `https://github.com/user/repo/commit/abc${i}def${Math.floor(
					Math.random() * 1000
				)}`,
			})),
	};
};
