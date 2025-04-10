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
	totalTrackedCommits?: number;
	commitsThisWeek?: number;
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

// Function to fetch all repositories for the authenticated user (including private/orgs)
export const fetchAllRepos = async (
	octokit: Octokit
): Promise<Repository[]> => {
	try {
		console.log(`Fetching repositories for authenticated user`);
		const repos: Repository[] = [];
		let page = 1;
		let hasMore = true;

		while (hasMore) {
			// Use listForAuthenticatedUser with affiliation for more explicit fetching
			const { data } = await octokit.rest.repos.listForAuthenticatedUser({
				// type: 'all', // Using affiliation instead
				affiliation: 'owner,collaborator,organization_member',
				per_page: 100,
				page,
			});

			if (data.length === 0) {
				hasMore = false;
			} else {
				repos.push(...data);
				page++;
				// Stop if we received less than per_page, indicating the last page
				if (data.length < 100) {
					hasMore = false;
				}
			}
		}

		console.log(`Found ${repos.length} repositories for authenticated user`);
		return repos;
	} catch (error) {
		console.error('Error fetching repositories:', error);
		return [];
	}
};

// Function to fetch commits for a repository (filtered by author)
export const fetchCommitsForRepo = async (
	octokit: Octokit,
	repoOwner: string,
	repo: string,
	authorUsername?: string // Added authorUsername parameter back
): Promise<Commit[]> => {
	try {
		console.log(
			`Fetching commits by ${
				authorUsername || 'authenticated user'
			} for ${repoOwner}/${repo}`
		); // Updated log
		const commits: Commit[] = [];
		let page = 1;
		let hasMore = true;

		// Get the authenticated user if author is not provided
		let author = authorUsername;
		if (!author) {
			try {
				const { data } = await octokit.rest.users.getAuthenticated();
				author = data.login;
				console.log(`Using authenticated user ${author} as commit author`);
			} catch (error) {
				console.error('Could not get authenticated user:', error);
				console.warn(
					`Proceeding to fetch commits for ${repoOwner}/${repo} without author filter.`
				);
			}
		}

		while (hasMore) {
			try {
				console.log(
					`Fetching page ${page} of commits for ${repoOwner}/${repo}${
						author ? ', author: ' + author : ''
					}` // Updated log
				);
				const { data } = await octokit.rest.repos.listCommits({
					owner: repoOwner, // Repository owner (organization or username)
					repo, // Repository name
					author, // Re-added author filter
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

// Function to fetch user events from GitHub's Events API (includes private activity)
export const fetchUserEvents = async (
	octokit: Octokit,
	// username: string, // No longer needed, uses authenticated user
	count: number = 10 // Fetch last 10 events by default
): Promise<ActivityEvent[]> => {
	try {
		// Get the authenticated user's username first to satisfy types
		const { data: authUserData } = await octokit.rest.users.getAuthenticated();
		const username = authUserData.login;

		console.log(
			`Fetching recent activity events for authenticated user (${username})`
		);

		const { data: events } =
			// Use listEventsForAuthenticatedUser to include private repo activity
			await octokit.rest.activity.listEventsForAuthenticatedUser({
				username, // Pass username to satisfy TS types, though API uses token
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

						summary = `Pushed ${
							commitCount > 1
								? `${commitCount} commits`
								: '"' + shortCommitMsg + '"'
						} to ${repoName}${branch ? ':' + branch : ''}`;
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
						actionVerb = event.payload.pull_request.merged
							? 'Merged'
							: 'Closed';
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
					else if (state === 'changes_requested')
						reviewType = 'Requested changes on';

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
					// Cast event to any within this block to bypass payload type inference issues
					const releaseEvent = event as any;

					// Check if payload and release exist before accessing
					if (releaseEvent.payload && releaseEvent.payload.release) {
						const action = releaseEvent.payload.action;
						const release = releaseEvent.payload.release;
						const releaseName = release.name || release.tag_name;

						details.action = action;
						details.title = releaseName;

						summary = `${
							action === 'published' ? 'Published' : 'Updated'
						} release ${releaseName}`;
						url = release.html_url;
					} else {
						console.warn(
							'Skipping ReleaseEvent due to missing payload or release property',
							event
						);
						continue;
					}
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
				details,
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
		const octokit = new Octokit({
			auth: token,
			request: {
				headers: {
					'Cache-Control': 'no-cache',
				},
			},
		});

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

			// Get all repositories for this user (now fetches private/orgs too)
			const allRepos = await fetchAllRepos(octokit);
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
					// and filter by the authenticated user's username as the author.
					const repoOwner = repo.owner.login;
					const repoCommits = await fetchCommitsForRepo(
						octokit,
						repoOwner,
						repo.name,
						username // Pass username to filter commits by author
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
				`Total commit objects after deduplication (all repos): ${commitData.length}`
			);

			// Sort all commits by date (newest first) - still useful for some contexts maybe
			commitData.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);

			// --- Filter Data Based on Tracked Repos ---

			// Get tracked/excluded repo lists
			const trackedRepoSettings = getTrackedRepositories();
			const excludedRepoSettings = getExcludedRepositories();
			const hasSpecificTracking =
				trackedRepoSettings.length > 0 || excludedRepoSettings.length > 0;

			// Create a map for all repos with their tracking status
			const repoTrackingStatusMap = new Map<string, boolean>();
			allRepos.forEach((repo) => {
				const isExplicitlyTracked = trackedRepoSettings.includes(repo.name);
				const isExplicitlyExcluded = excludedRepoSettings.includes(repo.name);
				// Default behavior: track if no specific settings, otherwise track if explicitly included
				// Exclude if explicitly excluded, overriding other rules.
				let isTracked = false;
				if (isExplicitlyExcluded) {
					isTracked = false;
				} else if (isExplicitlyTracked) {
					isTracked = true;
				} else if (!hasSpecificTracking && !repo.fork) {
					// If no specific lists are used, track all non-forked repos by default
					isTracked = true;
				}
				repoTrackingStatusMap.set(repo.name, isTracked);
			});

			// Filter commitData to only include commits from tracked repos
			const trackedCommitData = commitData.filter(
				(commit) =>
					commit.repo && repoTrackingStatusMap.get(commit.repo) === true
			);
			console.log(
				`Total commits in tracked repos: ${trackedCommitData.length}`
			);

			// Re-sort tracked commits by date (newest first)
			trackedCommitData.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);

			// --- Calculate Stats Based on TRACKED Data ---

			// Total commits (now means tracked commits)
			const totalCommits = trackedCommitData.length;
			const detailedCommits = trackedCommitData.length; // Align this too

			// Top Repos based on tracked commits
			const trackedRepoCommitCounts: { [key: string]: number } = {};
			trackedCommitData.forEach((commit) => {
				if (commit.repo) {
					trackedRepoCommitCounts[commit.repo] =
						(trackedRepoCommitCounts[commit.repo] || 0) + 1;
				}
			});
			const topRepos = Object.entries(trackedRepoCommitCounts)
				.map(([name, commits]) => ({ name, commits }))
				.sort((a, b) => b.commits - a.commits)
				.slice(0, 5);

			// Fetch recent activity using the Events API (still uses overall events)
			const recentActivityEvents_unfiltered = await fetchUserEvents(
				octokit,
				10
			); // Fetch a bit more to allow for filtering

			// Filter these events to only include those from tracked repos
			const recentActivityEvents = recentActivityEvents_unfiltered.filter(
				(event) =>
					event.repoName && repoTrackingStatusMap.get(event.repoName) === true
			);
			console.log(
				`Filtered ${recentActivityEvents_unfiltered.length} raw events down to ${recentActivityEvents.length} events from tracked repos.`
			);

			// Create ActivityEvents for the latest *tracked* commits
			const latestCommitEvents: ActivityEvent[] = trackedCommitData
				.slice(0, 10) // Take top 10 tracked commits
				.map((commit) => {
					const shortMessage = commit.message.split('\n')[0].substring(0, 70);
					return {
						type: 'Commit',
						date: commit.date,
						summary: `Commit: ${shortMessage}${
							commit.message.length > 70 ? '...' : ''
						}`,
						url: commit.url,
						repoName: commit.repo,
					};
				});

			// Combine events and latest *tracked* commits for recent activity feed
			let combinedActivity = [...latestCommitEvents, ...recentActivityEvents]; // Use the filtered list
			combinedActivity.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);
			const uniqueActivity: ActivityEvent[] = [];
			const seenUrls = new Set<string>();
			for (const event of combinedActivity) {
				if (event.url) {
					if (!seenUrls.has(event.url)) {
						uniqueActivity.push(event);
						seenUrls.add(event.url);
					}
				} else {
					uniqueActivity.push(event);
				}
			}
			const finalRecentActivity = uniqueActivity.slice(0, 6);

			// Calculate Streak based on *tracked* commits
			const streakDays = calculateStreak(trackedCommitData);

			// Calculate Commits This Month based on *tracked* commits
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			console.log(
				`Counting tracked commits since start of month: ${startOfMonth.toISOString()}`
			);
			const recentCommits = trackedCommitData.filter((commit) => {
				const commitDate = new Date(commit.date);
				return commitDate >= startOfMonth;
			}).length;
			console.log(
				`Found ${recentCommits} tracked commits in the current month`
			);

			// Calculate Commits This Week based on *tracked* commits
			const dayOfWeek = now.getDay(); // 0 = Sunday
			const startOfWeek = new Date(now);
			startOfWeek.setDate(now.getDate() - dayOfWeek);
			startOfWeek.setHours(0, 0, 0, 0);
			console.log(
				`Calculating tracked commits since start of week: ${startOfWeek.toISOString()}`
			);
			const commitsThisWeek = trackedCommitData.filter((commit) => {
				const commitDate = new Date(commit.date);
				return commitDate >= startOfWeek;
			}).length;
			console.log(
				`Found ${commitsThisWeek} commits this week in tracked repos`
			);

			// Last Commit Date based on *tracked* commits
			let lastCommitDate = new Date().toISOString(); // Default fallback
			if (trackedCommitData.length > 0) {
				lastCommitDate = trackedCommitData[0].date; // Use most recent tracked commit
			}

			// --- Assemble Final Stats ---

			// Get all repositories with updated tracking status for the UI list
			const allRepositoriesForUI = allRepos.map((repo) => ({
				name: repo.name,
				isTracked: repoTrackingStatusMap.get(repo.name) ?? false,
				isPrivate: repo.private,
			}));

			return {
				// Core stats now based on tracked repos
				totalCommits, // Count from tracked repos
				recentCommits, // Count this month from tracked repos
				streakDays, // Streak from tracked repos
				lastCommitDate, // Date from tracked repos
				topRepos, // Top repos from tracked repos
				detailedCommits, // Count from tracked repos (same as totalCommits)
				commitsThisWeek, // Count this week from tracked repos

				// Other info
				recentActivity: finalRecentActivity, // Combined feed (includes tracked commits)
				avatar: userData.avatar_url,
				username: userData.login,
				fullName: userData.name || userData.login,
				allRepositories: allRepositoriesForUI, // List for UI tracking toggles
				contributionCalendar, // Still the overall GraphQL calendar
				commitData, // Keep original full commit list for potential other uses
				stars: starsCount, // Still overall stars
				forks: forksCount, // Still overall forks
				profileInfo: {
					name: userData.name || userData.login,
					avatar: userData.avatar_url,
					profileUrl: userData.html_url,
					username: userData.login,
					followers: userData.followers,
					following: userData.following,
				},
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
