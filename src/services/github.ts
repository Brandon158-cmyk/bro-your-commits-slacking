import { Octokit } from 'octokit';
import { supabase } from '../lib/supabase';

// This service handles GitHub API interactions using Octokit

// Repository interface for GitHub repos
interface Repository {
	id: number;
	node_id: string;
	name: string;
	full_name: string;
	owner: {
		login: string;
		id: number;
		avatar_url: string;
		[key: string]: any;
	};
	private: boolean;
	fork: boolean;
	stargazers_count?: number;
	forks_count?: number;
	[key: string]: any; // Allow other properties from GitHub API
}

// Contribution calendar data from GraphQL
interface ContributionCalendar {
	totalContributions: number;
	weeks: Array<{
		contributionDays: Array<{
			date: string;
			contributionCount: number;
		}>;
	}>;
}

// Represents a recent activity event from GitHub's Events API
export type ActivityEvent = {
	type: string; // e.g., 'PushEvent', 'PullRequestEvent', 'IssuesEvent'
	date: string;
	summary: string; // A short description of the event
	url?: string; // Link to the commit, PR, issue, etc.
	repoName?: string; // Name of the repository
	details?: {
		branch?: string;
		commitCount?: number;
		action?: string; // 'opened', 'closed', 'merged', etc.
		number?: number; // PR or issue number
		title?: string; // PR or issue title
	};
};

export type Commit = {
	sha: string;
	date: string;
	message: string;
	url: string;
	repo?: string; // Optional repo property to track which repo a commit belongs to
};

export type GitHubStats = {
	totalCommits?: number;
	recentCommits?: number;
	streakDays?: number;
	lastCommitDate?: string;
	topRepos?: { name: string; commits: number }[];
	recentActivity?: ActivityEvent[]; // Changed from Commit[] to ActivityEvent[]
	avatar?: string;
	username?: string;
	fullName?: string;
	allRepositories?: { name: string; isTracked: boolean; isPrivate?: boolean }[];
	contributionCalendar?: ContributionCalendar;
	totalContributions?: number;
	detailedCommits?: number;
	commitData?: Commit[];
	stars?: number;
	forks?: number;
	profileInfo?: {
		name: string;
		avatar: string;
		profileUrl: string;
		username: string;
		bio?: string;
		company?: string;
		location?: string;
		blog?: string;
		followers: number;
		following: number;
	};
};

// Define a type for the expected PushEvent payload structure
interface PushEventPayload {
	ref?: string; // e.g., 'refs/heads/main'
	commits?: Array<{
		sha: string;
		message: string;
		author: { name?: string; email?: string };
	}>;
	// Push events for branch creation might have ref_type
	ref_type?: string;
	[key: string]: any; // Allow other properties
}

// Function to handle GitHub OAuth login via Supabase
export const loginWithGitHub = async () => {
	console.log('Initiating GitHub login with Supabase');

	try {
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				redirectTo: window.location.origin,
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
const calculateStreak = (commits: Commit[]): number => {
	if (!commits.length) return 0;

	// Sort commits by date (newest first)
	const sortedDates = commits
		.map((commit) => new Date(commit.date))
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

// Function to fetch all repositories for a user
export const fetchAllRepos = async (
	octokit: Octokit,
	username: string
): Promise<Repository[]> => {
	try {
		console.log(`Fetching repositories for ${username}`);
		const repos: Repository[] = [];
		let page = 1;
		let hasMore = true;

		while (hasMore) {
			const { data } = await octokit.rest.repos.listForUser({
				username,
				per_page: 100,
				page,
			});

			if (data.length === 0) {
				hasMore = false;
			} else {
				repos.push(...data);
				page++;
			}
		}

		console.log(`Found ${repos.length} repositories for ${username}`);
		return repos;
	} catch (error) {
		console.error('Error fetching repositories:', error);
		return [];
	}
};

// Function to fetch commits for a repository
export const fetchCommitsForRepo = async (
	octokit: Octokit,
	repoOwner: string,
	repo: string,
	authorUsername?: string
): Promise<Commit[]> => {
	try {
		console.log(`Fetching commits for ${repoOwner}/${repo}`);
		const commits: Commit[] = [];
		let page = 1;
		let hasMore = true;

		// If author is not provided, get the authenticated user
		let author = authorUsername;
		if (!author) {
			try {
				const { data } = await octokit.rest.users.getAuthenticated();
				author = data.login;
				console.log(`Using authenticated user ${author} as commit author`);
			} catch (error) {
				console.error('Could not get authenticated user:', error);
			}
		}

		while (hasMore) {
			try {
				console.log(
					`Fetching page ${page} of commits for ${repoOwner}/${repo}, author: ${author}`
				);
				const { data } = await octokit.rest.repos.listCommits({
					owner: repoOwner, // Repository owner (organization or username)
					repo, // Repository name
					author, // Author's GitHub username (should be the authenticated user)
					per_page: 100,
					page,
				});

				console.log(`Found ${data.length} commits on page ${page} for ${repo}`);

				if (data.length === 0) {
					hasMore = false;
				} else {
					data.forEach((commit) => {
						if (commit.commit && commit.sha) {
							// Log the date of the commit being added
							const commitDateStr = commit.commit.author?.date || 'No Date';
							console.log(
								`   Adding commit SHA: ${commit.sha.substring(
									0,
									7
								)}, Date: ${commitDateStr}`
							);
							commits.push({
								sha: commit.sha,
								date:
									commitDateStr === 'No Date'
										? new Date().toISOString()
										: commitDateStr,
								message: commit.commit.message || '',
								url:
									commit.html_url || `https://github.com/${repoOwner}/${repo}`,
								repo,
							});
						}
					});
					page++;

					// If we got less than 100 commits, we've reached the end for this repo
					if (data.length < 100) {
						hasMore = false;
					}
				}
			} catch (error) {
				console.error(
					`Error fetching page ${page} of commits for ${repo}:`,
					error
				);
				hasMore = false; // Stop pagination on error for this repo
			}
		}

		console.log(
			`Found ${commits.length} total commits for ${repoOwner}/${repo}`
		);
		return commits;
	} catch (error) {
		console.error(`Error in fetchCommitsForRepo for ${repo}:`, error);
		return [];
	}
};

// Function to fetch contribution data using GraphQL
export const fetchContributionData = async (
	octokit: Octokit,
	username: string
): Promise<ContributionCalendar | null> => {
	try {
		console.log(`Fetching contribution data for ${username}`);

		const query = `
			query($username: String!) {
				user(login: $username) {
					contributionsCollection {
						contributionCalendar {
							totalContributions
							weeks {
								contributionDays {
									contributionCount
									date
								}
							}
						}
					}
				}
			}
		`;

		const response: any = await octokit.graphql(query, { username });
		const calendar = response.user.contributionsCollection.contributionCalendar;

		if (calendar) {
			console.log(
				`Total contributions for ${username}: ${calendar.totalContributions}`
			);

			// Count contributions by month
			const contributionsByMonth: Record<string, number> = {};

			calendar.weeks.forEach((week: any) => {
				week.contributionDays.forEach((day: any) => {
					const date = new Date(day.date);
					const monthKey = `${date.getFullYear()}-${String(
						date.getMonth() + 1
					).padStart(2, '0')}`;

					if (!contributionsByMonth[monthKey]) {
						contributionsByMonth[monthKey] = 0;
					}

					contributionsByMonth[monthKey] += day.contributionCount;
				});
			});

			console.log('Contributions by month:');
			Object.entries(contributionsByMonth)
				.sort((a, b) => a[0].localeCompare(b[0]))
				.forEach(([month, count]) => {
					console.log(`  ${month}: ${count} contributions`);
				});

			return calendar;
		} else {
			console.log('No contribution calendar data found');
			return null;
		}
	} catch (error) {
		console.error('Error fetching contribution data:', error);
		return null;
	}
};

// Function to fetch user events from GitHub's Events API
export const fetchUserEvents = async (
	octokit: Octokit,
	username: string,
	count: number = 10 // Fetch last 10 events by default
): Promise<ActivityEvent[]> => {
	try {
		console.log(`Fetching recent activity events for ${username}`);
		const { data: events } =
			await octokit.rest.activity.listPublicEventsForUser({
				username,
				per_page: count * 2, // Fetch more initially to filter down
			});

		const activity: ActivityEvent[] = [];

		for (const event of events) {
			if (activity.length >= count) break; // Stop once we have enough

			let summary = 'Unknown event';
			let url: string | undefined;
			const repoName = event.repo.name;
			const date = event.created_at || new Date().toISOString();
			let details: ActivityEvent['details'] = {};

			switch (event.type) {
				case 'PushEvent': {
					const pushPayload = event.payload as PushEventPayload;
					const ref = pushPayload.ref;
					const branch = ref?.startsWith('refs/heads/')
						? ref.substring(11)
						: ref;
					
					details.branch = branch;

					if (pushPayload.commits && pushPayload.commits.length > 0) {
						const commitCount = pushPayload.commits.length;
						details.commitCount = commitCount;
						
						const commit = pushPayload.commits[0]; // Get the first commit of the push
						const commitMsg = commit.message.split('\n')[0];
						const shortCommitMsg =
							commitMsg.substring(0, 50) + (commitMsg.length > 50 ? '...' : '');

						summary = `Pushed ${commitCount > 1 ? `${commitCount} commits` : '"' + shortCommitMsg + '"'} to ${repoName}${
							branch ? ':' + branch : ''
						}`;
						url = `https://github.com/${repoName}/commit/${commit.sha}`;
					} else if (pushPayload.ref_type === 'branch' && ref) {
						// Handle case where push event is branch creation without commits
						summary = `Created branch ${branch} in ${repoName}`;
						url = `https://github.com/${repoName}/tree/${branch}`;
					} else {
						continue; // Skip other types of push events (e.g., tag pushes)
					}
					break;
				}
				case 'PullRequestEvent': {
					// @ts-ignore
					const action = event.payload.action;
					// @ts-ignore
					const prNumber = event.payload.pull_request.number;
					// @ts-ignore
					const prTitle = event.payload.pull_request.title;
					
					details.action = action;
					details.number = prNumber;
					details.title = prTitle;
					
					let actionVerb = 'Updated';
					if (action === 'opened') actionVerb = 'Opened';
					else if (action === 'closed') {
						// @ts-ignore
						actionVerb = event.payload.pull_request.merged ? 'Merged' : 'Closed';
					}
					
					summary = `${actionVerb} PR #${prNumber}: ${prTitle}`;
					// @ts-ignore
					url = event.payload.pull_request.html_url;
					break;
				}
				case 'IssuesEvent': {
					// @ts-ignore
					const action = event.payload.action;
					// @ts-ignore
					const issueNumber = event.payload.issue.number;
					// @ts-ignore
					const issueTitle = event.payload.issue.title;
					
					details.action = action;
					details.number = issueNumber;
					details.title = issueTitle;
					
					let actionVerb = 'Updated';
					if (action === 'opened') actionVerb = 'Opened';
					else if (action === 'closed') actionVerb = 'Closed';
					
					summary = `${actionVerb} issue #${issueNumber}: ${issueTitle}`;
					// @ts-ignore
					url = event.payload.issue.html_url;
					break;
				}
				case 'IssueCommentEvent': {
					// @ts-ignore
					const issueNumber = event.payload.issue.number;
					// @ts-ignore
					const isPR = !!event.payload.issue.pull_request;
					
					details.number = issueNumber;
					// @ts-ignore
					details.title = event.payload.issue.title;
					
					summary = `Commented on ${isPR ? 'PR' : 'issue'} #${issueNumber}`;
					// @ts-ignore
					url = event.payload.comment.html_url;
					break;
				}
				case 'PullRequestReviewEvent': {
					// @ts-ignore
					const prNumber = event.payload.pull_request.number;
					// @ts-ignore
					const state = event.payload.review.state;
					
					details.number = prNumber;
					// @ts-ignore
					details.title = event.payload.pull_request.title;
					details.action = state;
					
					let reviewType = 'Reviewed';
					if (state === 'approved') reviewType = 'Approved';
					else if (state === 'changes_requested') reviewType = 'Requested changes on';
					
					summary = `${reviewType} PR #${prNumber}`;
					// @ts-ignore
					url = event.payload.review.html_url;
					break;
				}
				case 'CreateEvent': {
					// @ts-ignore
					const refType = event.payload.ref_type;
					// @ts-ignore
					const ref = event.payload.ref;
					
					details.action = 'created';
					
					if (refType === 'repository') {
						summary = `Created repository ${repoName}`;
						url = `https://github.com/${repoName}`;
					} else if (refType === 'branch') {
						details.branch = ref;
						summary = `Created branch ${ref} in ${repoName}`;
						url = `https://github.com/${repoName}/tree/${ref}`;
					} else if (refType === 'tag') {
						summary = `Created tag ${ref} in ${repoName}`;
						url = `https://github.com/${repoName}/releases/tag/${ref}`;
					} else {
						continue; // Ignore other create events for now
					}
					break;
				}
				case 'ForkEvent': {
					// @ts-ignore
					const forkName = event.payload.forkee.full_name;
					summary = `Forked ${repoName} to ${forkName}`;
					// @ts-ignore
					url = event.payload.forkee.html_url;
					break;
				}
				case 'WatchEvent': {
					// @ts-ignore
					if (event.payload.action === 'started') {
						summary = `Starred ${repoName}`;
						url = `https://github.com/${repoName}`;
					} else {
						continue;
					}
					break;
				}
				case 'ReleaseEvent': {
					// @ts-ignore
					const action = event.payload.action;
					// @ts-ignore
					const releaseName = event.payload.release.name || event.payload.release.tag_name;
					
					details.action = action;
					details.title = releaseName;
					
					summary = `${action === 'published' ? 'Published' : 'Updated'} release ${releaseName}`;
					// @ts-ignore
					url = event.payload.release.html_url;
					break;
				}
				// Add more cases as needed (e.g., GollumEvent for wiki edits)
				default:
					// console.log('Unhandled event type:', event.type);
					continue; // Skip unhandled event types
			}

			activity.push({ 
				type: event.type, 
				date, 
				summary, 
				url, 
				repoName,
				details 
			});
		}

		console.log(`Found ${activity.length} relevant activity events`);
		return activity;
	} catch (error) {
		console.error('Error fetching user activity events:', error);
		return [];
	}
};

// Function to fetch GitHub stats using Octokit
export const fetchGitHubStats = async (
	token: string
): Promise<GitHubStats | null> => {
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

			const username = userData.login;

			// Get all repositories for this user
			const allRepos = await fetchAllRepos(octokit, username);
			const userRepos = allRepos.filter((repo) => !repo.fork);

			// Get contribution calendar data from GraphQL API
			const contributionCalendar = await fetchContributionData(
				octokit,
				username
			);
			const totalContributions = contributionCalendar?.totalContributions || 0;

			// Get individual commit data for more detailed statistics
			let commitData: Commit[] = [];
			let totalCommitApiCalls = 0; // Track API calls
			let starsCount = 0;
			let forksCount = 0;

			// Process repos
			console.log(
				`Processing ${userRepos.length} repositories for commit data...`
			);
			for (const repo of userRepos) {
				console.log(`-- Processing repo: ${repo.full_name}`);
				starsCount += repo.stargazers_count || 0;
				forksCount += repo.forks_count || 0;

				try {
					// We need to use the repository owner (which might be an organization)
					// and the authenticated user's username as the author
					const repoOwner = repo.owner.login;
					const repoCommits = await fetchCommitsForRepo(
						octokit,
						repoOwner,
						repo.name,
						username
					);
					totalCommitApiCalls++; // Increment API call counter
					console.log(
						`   Fetched ${repoCommits.length} commits from ${repoOwner}/${repo.name}`
					);
					commitData = commitData.concat(repoCommits);
				} catch (error) {
					console.error(`   Error fetching commits for ${repo.name}:`, error);
				}
			}

			console.log(
				`Finished processing repositories. Total commit API calls: ${totalCommitApiCalls}`
			);
			console.log(
				`Total commit objects collected before deduplication: ${commitData.length}`
			);

			// Create top repos list and ensure commitData is deduplicated by SHA
			const repoCommitCounts: { [key: string]: number } = {};
			const commitMap = new Map<string, Commit>();

			commitData.forEach((commit) => {
				// Deduplicate commits by SHA
				commitMap.set(commit.sha, commit);

				// Count commits by repo
				if (commit.repo) {
					repoCommitCounts[commit.repo] =
						(repoCommitCounts[commit.repo] || 0) + 1;
				}
			});

			// Get deduplicated commits
			commitData = Array.from(commitMap.values());
			console.log(
				`Total commit objects after deduplication: ${commitData.length}`
			);

			// Sort commits by date (newest first)
			commitData.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);

			const topRepos = Object.entries(repoCommitCounts)
				.map(([name, commits]) => ({ name, commits }))
				.sort((a, b) => b.commits - a.commits)
				.slice(0, 5);

			// Fetch recent activity using the Events API
			const recentActivity = await fetchUserEvents(octokit, username, 5); // Get top 5 recent events

			// Calculate streaks
			const streakDays = calculateStreak(commitData);

			// Count recent commits (current calendar month)
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			console.log(
				`Counting commits since the start of the month: ${startOfMonth.toISOString()}`
			);

			// Count recent commits from direct API for the current month
			console.log('--- Filtering commits for current month ---');
			const recentCommitsFromAPI = commitData.filter((commit) => {
				const commitDate = new Date(commit.date);
				const isRecent = commitDate >= startOfMonth;
				// More verbose logging for debugging
				console.log(
					`   Commit SHA: ${commit.sha.substring(
						0,
						7
					)}, Date: ${commitDate.toISOString()}, Is Recent: ${isRecent}`
				);
				return isRecent;
			}).length;
			console.log('--- Finished filtering ---');

			console.log(`Found ${recentCommitsFromAPI} commits in the current month`);

			// Initialize GraphQL counter outside the if block
			let graphQLRecentContributions = 0;

			// If we have GraphQL data, also print out the contributions by day for comparison
			if (
				contributionCalendar?.weeks &&
				contributionCalendar.weeks.length > 0
			) {
				console.log(`GraphQL contribution data by day (current month):`);
				// Reset counter inside if needed, or just use the outer scope one
				// graphQLRecentContributions = 0; // Uncomment if you want to reset per function call

				for (const week of contributionCalendar.weeks) {
					for (const day of week.contributionDays) {
						const contributionDate = new Date(day.date);
						if (contributionDate >= startOfMonth) {
							console.log(
								`  ${contributionDate.toLocaleDateString()}: ${
									day.contributionCount
								} contributions`
							);
							if (day.contributionCount > 0) {
								graphQLRecentContributions += day.contributionCount;
							}
						}
					}
				}

				console.log(
					`Total GraphQL contributions in current month: ${graphQLRecentContributions}`
				);
			}

			// Use the GraphQL contribution count for recent activity as it appears more comprehensive
			// even though it includes non-commit contributions.
			const recentCommits =
				graphQLRecentContributions > 0
					? graphQLRecentContributions
					: recentCommitsFromAPI;

			console.log(
				`Recent commits from API (current month): ${recentCommitsFromAPI}`
			);
			console.log(
				`Total contributions from GraphQL (current month): ${graphQLRecentContributions}`
			);
			console.log(
				`Using final count for 'commits this month': ${recentCommits}`
			);

			// Get the most recent commit date (still useful)
			let lastCommitDate = new Date().toISOString();
			if (commitData.length > 0) {
				lastCommitDate = commitData[0].date;
			}
			// Cross-check with GraphQL for potentially more recent contribution date
			if (
				contributionCalendar?.weeks &&
				contributionCalendar.weeks.length > 0
			) {
				let mostRecentGraphQLDate = '';
				for (const week of contributionCalendar.weeks) {
					for (const day of week.contributionDays) {
						if (day.contributionCount > 0) {
							if (!mostRecentGraphQLDate || day.date > mostRecentGraphQLDate) {
								mostRecentGraphQLDate = day.date;
							}
						}
					}
				}
				if (
					mostRecentGraphQLDate &&
					new Date(mostRecentGraphQLDate) > new Date(lastCommitDate)
				) {
					lastCommitDate = mostRecentGraphQLDate;
					console.log(
						`Using more recent date from GraphQL: ${new Date(
							lastCommitDate
						).toLocaleDateString()}`
					);
				}
			}

			// Get all repositories with tracking status
			const trackedRepos = getTrackedRepositories();
			const excludedRepos = getExcludedRepositories();

			const allRepositories = allRepos.map((repo) => ({
				name: repo.name,
				isTracked:
					trackedRepos.includes(repo.name) ||
					(!trackedRepos.length && !excludedRepos.includes(repo.name)),
				isPrivate: repo.private,
			}));

			return {
				totalCommits: totalContributions || totalCommitApiCalls,
				recentCommits,
				streakDays,
				lastCommitDate,
				topRepos,
				recentActivity,
				avatar: userData.avatar_url,
				username: userData.login,
				fullName: userData.name || userData.login,
				allRepositories,
				contributionCalendar,
				detailedCommits: commitData.length,
				commitData,
				stars: starsCount,
				forks: forksCount,
				profileInfo: {
					name: userData.name || userData.login,
					avatar: userData.avatar_url,
					profileUrl: userData.html_url,
					username: userData.login,
					followers: userData.followers,
					following: userData.following,
				},
				totalContributions,
			};
		} catch (userError) {
			console.error('Error getting authenticated user:', userError);
			throw userError;
		}
	} catch (error) {
		console.error('Error fetching GitHub stats:', error);
		return null;
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
