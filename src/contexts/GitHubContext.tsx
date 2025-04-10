import React, { createContext, useContext, useState, useEffect } from 'react';
import {
	GitHubStats,
	checkAuth,
	fetchGitHubStats,
	handleAuthCallback,
	loginWithGitHub,
	logout,
} from '../services/github';

// Define context type
interface GitHubContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	stats: GitHubStats | null;
	error: string | null;
	login: () => Promise<void>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

// Create context with default values
const GitHubContext = createContext<GitHubContextType>({
	isAuthenticated: false,
	isLoading: true,
	stats: null,
	error: null,
	login: async () => {},
	logout: async () => {},
	refresh: async () => {},
});

// Hook to use the GitHub context
export const useGitHub = () => useContext(GitHubContext);

// Provider component to wrap app with GitHub context
export const GitHubProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [stats, setStats] = useState<GitHubStats | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);

	// Fetch GitHub stats with the current token
	const fetchStats = async (authToken: string) => {
		setIsLoading(true);
		setError(null);

		try {
			console.log('Fetching GitHub stats...');
			const githubStats = await fetchGitHubStats(authToken);
			setStats(githubStats);
			setError(null);
		} catch (statsError: any) {
			console.error('Error fetching GitHub stats:', statsError);
			setError(
				statsError?.message ||
					'Failed to fetch GitHub data. Please try again later.'
			);
			setStats(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Refresh stats manually
	const refresh = async () => {
		if (!token) {
			console.error('Cannot refresh - no token available');
			setError('Not logged in. Please login first.');
			return;
		}

		await fetchStats(token);
	};

	// Check authentication status and handle callback if needed
	const checkAuthentication = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Clear error URL params if they exist
			const url = new URL(window.location.href);
			if (url.searchParams.has('error')) {
				// Remove error params from URL
				url.searchParams.delete('error');
				url.searchParams.delete('error_code');
				url.searchParams.delete('error_description');
				window.history.replaceState({}, document.title, url.toString());

				// Handle the error from URL
				const errorMsg = 'Authentication failed. Please try again.';
				setError(errorMsg);
				setIsAuthenticated(false);
				setIsLoading(false);
				return;
			}

			// Handle auth callback if we're returning from GitHub
			try {
				const newToken = await handleAuthCallback();

				// If no token from callback, check for existing auth
				const existingToken = newToken || (await checkAuth());

				if (!existingToken) {
					setIsAuthenticated(false);
					setToken(null);
					setIsLoading(false);
					return;
				}

				// Set authenticated status and token
				setIsAuthenticated(true);
				setToken(existingToken);

				// Fetch GitHub stats
				await fetchStats(existingToken);
			} catch (callbackError: any) {
				console.error('Authentication callback error:', callbackError);
				setError(
					callbackError?.message || 'Failed to authenticate with GitHub'
				);
				setIsAuthenticated(false);
				setToken(null);
			}
		} catch (authError: any) {
			console.error('Authentication error:', authError);
			setError(
				authError?.message || 'Error: Failed to authenticate with GitHub'
			);
			setIsAuthenticated(false);
			setToken(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle login
	const login = async () => {
		try {
			setError(null);
			await loginWithGitHub();
		} catch (loginError) {
			console.error('Login error:', loginError);
			setError('Error logging in with GitHub');
		}
	};

	// Handle logout
	const handleLogout = async () => {
		try {
			setIsLoading(true);
			await logout();
			setIsAuthenticated(false);
			setStats(null);
			setToken(null);
		} catch (logoutError) {
			console.error('Logout error:', logoutError);
			setError('Error logging out');
		} finally {
			setIsLoading(false);
		}
	};

	// Check authentication on mount
	useEffect(() => {
		checkAuthentication();
	}, []);

	const value = {
		isAuthenticated,
		isLoading,
		stats,
		error,
		login,
		logout: handleLogout,
		refresh,
	};

	return (
		<GitHubContext.Provider value={value}>{children}</GitHubContext.Provider>
	);
};
