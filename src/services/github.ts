import { Octokit } from 'octokit';
import { supabase } from '../lib/supabase';

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
	avatar?: string; // Add avatar URL
	username?: string; // Add GitHub username
	fullName?: string; // Add full name if available
	allRepositories?: { name: string; isTracked: boolean }[]; // Add all repos with tracking status
};

// Function to handle GitHub OAuth login via Supabase
export const loginWithGitHub = async () => {
	console.log('Initiating GitHub login with Supabase');

	try {
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				redirectTo: window.location.origin,
				// Use proper format for GitHub scopes (space-separated)
				scopes: 'repo read:user user:email',
			},
		});

		if (error) {
			throw error;
		}

		console.log('GitHub login initiated:', data);
	} catch (error) {
		console.error('Error starting GitHub login:', error);
		throw error;
	}
};

// Function to handle auth session state
export const handleAuthCallback = async (): Promise<string | null> => {
	try {
		// Check for errors in URL
		const url = new URL(window.location.href);
		const errorParam = url.searchParams.get('error');
		const errorDescription = url.searchParams.get('error_description');

		if (errorParam) {
			console.error(`Auth error: ${errorParam} - ${errorDescription}`);
			throw new Error(
				`Authentication error: ${errorDescription || errorParam}`
			);
		}

		// Handle hash fragment errors (Supabase sometimes puts errors in hash)
		const hashParams = new URLSearchParams(window.location.hash.substring(1));
		const hashError = hashParams.get('error');
		const hashErrorDescription = hashParams.get('error_description');

		if (hashError) {
			console.error(`Auth hash error: ${hashError} - ${hashErrorDescription}`);
			throw new Error(
				`Authentication error: ${hashErrorDescription || hashError}`
			);
		}

		// Get the current session
		const {
			data: { session },
			error,
		} = await supabase.auth.getSession();

		if (error) {
			console.error('Error getting session:', error);
			return null;
		}

		if (!session) {
			console.log('No active session found');
			return null;
		}

		console.log('Session obtained:', {
			hasProviderToken: !!session.provider_token,
			hasAccessToken: !!session.access_token,
			user: session.user?.id,
		});

		// Try to get provider token - this contains GitHub access token
		const { provider_token, access_token } = session;

		if (provider_token) {
			console.log('Provider token found, storing in localStorage');
			// Store the GitHub token in localStorage for app use
			localStorage.setItem('github_token', provider_token);
			return provider_token;
		} else if (access_token) {
			// Try to get the GitHub token from the provider token in user metadata
			try {
				// Fetch the user details to see if we have more data
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError) {
					throw userError;
				}

				// Check for GitHub specific data in provider data
				if (
					user?.app_metadata?.provider === 'github' &&
					user?.app_metadata?.provider_token
				) {
					const githubToken = user.app_metadata.provider_token;
					console.log('Found GitHub token in user metadata');
					localStorage.setItem('github_token', githubToken);
					return githubToken;
				}
			} catch (metadataError) {
				console.error('Error getting user metadata:', metadataError);
			}

			// If no provider token but we have an access token, we can try to use that
			console.log('No provider token found, using access token instead');
			localStorage.setItem('github_token', access_token);
			return access_token;
		}

		console.warn('Session exists but no token found');
		return null;
	} catch (error) {
		console.error('Error during GitHub session handling:', error);
		throw error; // Re-throw to allow context to show error message
	}
};

// Function to check if user is authenticated
export const checkAuth = async (): Promise<string | null> => {
	// First check localStorage for existing token
	const localToken = localStorage.getItem('github_token');

	if (localToken) {
		return localToken;
	}

	// Otherwise check Supabase session
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (session?.provider_token) {
			localStorage.setItem('github_token', session.provider_token);
			return session.provider_token;
		}
	} catch (error) {
		console.error('Error checking auth:', error);
	}

	return null;
};

// Function to logout user
export const logout = async () => {
	localStorage.removeItem('github_token');
	await supabase.auth.signOut();
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
		console.log(
			'Starting to fetch GitHub stats with token:',
			token.substring(0, 10) + '...'
		);

		// Initialize Octokit with the user's token
		const octokit = new Octokit({ auth: token });

		try {
			// Test API access
			const { data: rateLimit } = await octokit.rest.rateLimit.get();
			console.log('GitHub API rate limit:', rateLimit.resources.core);
		} catch (rateLimitError) {
			console.error('Error checking rate limit:', rateLimitError);
			// Continue anyway, this was just a test
		}

		// Get user information
		try {
			const { data: userData } = await octokit.rest.users.getAuthenticated();
			console.log('Authenticated GitHub user:', userData.login);

			return fetchRealGitHubStats(octokit, userData.login);
		} catch (userError: any) {
			console.error('Error getting authenticated user:', userError);

			// If we get a 401 unauthorized error, the token might be invalid
			if (userError.status === 401) {
				console.log('Token appears to be invalid, trying to refresh session');

				// Try to get a fresh token from Supabase
				const {
					data: { session },
				} = await supabase.auth.getSession();
				if (session?.provider_token) {
					console.log('Got fresh token from session, retrying');
					localStorage.setItem('github_token', session.provider_token);

					// Reinitialize Octokit with the new token
					const newOctokit = new Octokit({ auth: session.provider_token });
					const { data: newUserData } =
						await newOctokit.rest.users.getAuthenticated();
					return fetchRealGitHubStats(newOctokit, newUserData.login);
				}
			}

			// If we can't get a username, let's ask the user directly
			const username = prompt(
				'Could not determine your GitHub username. Please enter it manually:',
				''
			);
			if (username) {
				console.log('Using manually entered username:', username);
				return fetchRealGitHubStats(octokit, username);
			}

			throw new Error(
				'Could not get GitHub username. Please try logging in again.'
			);
		}
	} catch (error) {
		console.error('Error fetching GitHub stats:', error);
		throw new Error(
			'Failed to fetch GitHub data. Please check your authentication and try again.'
		);
	}
};

// Get the list of repositories to track/not track
export const getTrackedRepositories = (): string[] => {
	const trackedRepos = localStorage.getItem('github_tracked_repos');
	return trackedRepos ? JSON.parse(trackedRepos) : [];
};

// Get the list of repositories to explicitly exclude
export const getExcludedRepositories = (): string[] => {
	const excludedRepos = localStorage.getItem('github_excluded_repos');
	return excludedRepos ? JSON.parse(excludedRepos) : [];
};

// Add a repository to track
export const addTrackedRepository = (repoName: string): void => {
	const trackedRepos = getTrackedRepositories();
	if (!trackedRepos.includes(repoName)) {
		trackedRepos.push(repoName);
		localStorage.setItem('github_tracked_repos', JSON.stringify(trackedRepos));
	}

	// Also remove from excluded if it's there
	removeExcludedRepository(repoName);
};

// Remove a repository from tracked list
export const removeTrackedRepository = (repoName: string): void => {
	const trackedRepos = getTrackedRepositories();
	const updatedRepos = trackedRepos.filter((repo) => repo !== repoName);
	localStorage.setItem('github_tracked_repos', JSON.stringify(updatedRepos));
};

// Add a repository to excluded list
export const addExcludedRepository = (repoName: string): void => {
	const excludedRepos = getExcludedRepositories();
	if (!excludedRepos.includes(repoName)) {
		excludedRepos.push(repoName);
		localStorage.setItem(
			'github_excluded_repos',
			JSON.stringify(excludedRepos)
		);
	}

	// Also remove from tracked if it's there
	removeTrackedRepository(repoName);
};

// Remove a repository from excluded list
export const removeExcludedRepository = (repoName: string): void => {
	const excludedRepos = getExcludedRepositories();
	const updatedRepos = excludedRepos.filter((repo) => repo !== repoName);
	localStorage.setItem('github_excluded_repos', JSON.stringify(updatedRepos));
};

// Toggle repository tracking status
export const toggleRepositoryTracking = (
	repoName: string,
	isTracked: boolean
): void => {
	if (isTracked) {
		addTrackedRepository(repoName);
	} else {
		addExcludedRepository(repoName);
	}
};

// Function to fetch real GitHub stats - Update to consider tracked/excluded repos
const fetchRealGitHubStats = async (
	octokit: Octokit,
	username: string
): Promise<GitHubStats> => {
	try {
		// Get user information for profile data
		const { data: userData } = await octokit.rest.users.getByUsername({
			username,
		});

		// Get user's repositories
		const { data: repos } = await octokit.rest.repos.listForUser({
			username,
			sort: 'updated',
			per_page: 100,
		});

		// Get tracked and excluded repos
		const trackedRepos = getTrackedRepositories();
		const excludedRepos = getExcludedRepositories();

		// Create list of all repos with tracking status
		const allRepositories = repos.map((repo) => ({
			name: repo.name,
			isTracked:
				trackedRepos.includes(repo.name) ||
				(!trackedRepos.length && !excludedRepos.includes(repo.name)),
		}));

		// Filter repos based on tracked/excluded
		let reposToProcess = repos;

		// If we have explicit tracked repos, use only those
		if (trackedRepos.length > 0) {
			reposToProcess = repos.filter((repo) => trackedRepos.includes(repo.name));
		}
		// Otherwise, exclude the excluded ones
		else if (excludedRepos.length > 0) {
			reposToProcess = repos.filter(
				(repo) => !excludedRepos.includes(repo.name)
			);
		}

		// Get recent commits from all repos
		let allCommits: any[] = [];
		let topRepos: { name: string; commits: number }[] = [];

		// We'll limit to processing the repos to avoid rate limits
		const recentRepos = reposToProcess.slice(0, 10);

		for (const repo of recentRepos) {
			try {
				// Get commits for this repo
				const { data: repoCommits } = await octokit.rest.repos.listCommits({
					owner: repo.owner.login,
					repo: repo.name,
					author: username,
					per_page: 30, // Limit per repo to avoid rate limits
				});

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
		topRepos.sort((a, b) => b.commits - a.commits);

		// Limit to top 3 repos
		topRepos = topRepos.slice(0, 3);

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
			topRepos,
			recentActivity,
			avatar: userData.avatar_url,
			username: userData.login,
			fullName: userData.name || userData.login,
			allRepositories,
		};
	} catch (error) {
		console.error('Error fetching real GitHub stats:', error);
		throw error;
	}
};
