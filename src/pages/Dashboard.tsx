import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Calendar,
	Clock,
	GitCommit,
	ArrowUpRight,
	RefreshCw,
	LogOut,
	User,
	Settings,
	Check,
	X,
	ChevronDown,
	ChevronUp,
	Lock,
	Unlock,
} from 'lucide-react';
import { format } from 'date-fns';
import { HandDrawnButton } from '@/components/custom/hand-drawn-button';
import { HandDrawnCard } from '@/components/custom/hand-drawn-card';
import { CommitMeter } from '@/components/custom/commit-meter';
import { useGitHub } from '@/contexts/GitHubContext';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
	toggleRepositoryTracking,
	type ActivityEvent,
} from '@/services/github';
import { RepoGuide } from '@/components/custom/RepoGuide';
import { cn } from '@/lib/utils';

const Dashboard = () => {
	const navigate = useNavigate();
	const { isAuthenticated, isLoading, stats, error, logout, refresh } =
		useGitHub();
	const [showRepoSettings, setShowRepoSettings] = useState(false);
	const [showGuide, setShowGuide] = useState(true);
	const [togglingRepo, setTogglingRepo] = useState<string | null>(null);

	const DAILY_GOAL = 3; // Define daily goal constant

	React.useEffect(() => {
		if (!isAuthenticated) {
			navigate('/');
		}
	}, [isAuthenticated, navigate]);

	const handleRefresh = async () => {
		try {
			await refresh();
		} catch (error) {
			console.error('Error refreshing stats:', error);
		}
	};

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error('Error logging out:', error);
		}
	};

	const handleToggleRepository = async (
		repoName: string,
		isTracked: boolean
	) => {
		setTogglingRepo(repoName);
		try {
			toggleRepositoryTracking(repoName, isTracked);
			await handleRefresh();
		} catch (error) {
			console.error('Error toggling repository:', error);
		} finally {
			setTogglingRepo(null);
		}
	};

	const toggleRepoSettings = () => {
		setShowRepoSettings(!showRepoSettings);
		if (!showRepoSettings) {
			setShowGuide(false);
		}
	};

	if (!isAuthenticated) {
		return null;
	}

	const getSlackingMessage = () => {
		if (!stats) return 'Loading your stats...';

		const { commitsToday = 0 } = stats;
		const goal = DAILY_GOAL;
		const bonusGoal = goal * 2;

		if (commitsToday === 0)
			return 'Zero commits today? Ops are deploying circles around you! 😴';
		if (commitsToday < goal)
			return "Still haven't hit the daily goal! Chop chop! 🏃‍♂️";
		if (commitsToday === goal)
			return 'Daily goal met! Just scraping by, eh? 😉';
		if (commitsToday < bonusGoal) return 'Goal smashed! Nice work! 🔥';
		return 'Bonus goal achieved! True commit warrior! ⚔️';
	};

	const getStreakMessage = () => {
		if (!stats) return '';

		const { streakDays } = stats;

		if (streakDays === 0) return 'No streak? Did you ghost your repos? 👻';
		if (streakDays < 3) return "Baby streak! Let's grow it! 🌱";
		if (streakDays < 7) return "Almost a week! Don't break the chain! ⛓️";
		return "Legendary streak! You're a coding machine! 🤖";
	};

	return (
		<div className='min-h-screen flex flex-col p-4 md:p-8'>
			{showGuide && stats?.allRepositories && (
				<RepoGuide onToggleSettings={toggleRepoSettings} />
			)}

			<div className='max-w-4xl w-full mx-auto'>
				<div className='flex justify-between items-center mb-6'>
					<div className='flex items-center gap-4'>
						<h1 className='text-3xl md:text-4xl font-handwritten'>
							Your Commit Report
						</h1>
						{stats?.avatar && (
							<Avatar className='h-10 w-10 border-2 border-ink-blue'>
								<AvatarImage
									src={stats.avatar}
									alt={stats.username || 'User'}
								/>
								<AvatarFallback>
									<User className='h-6 w-6' />
								</AvatarFallback>
							</Avatar>
						)}
						{stats?.username && (
							<span className='text-sm font-medium text-pencil'>
								@{stats.username}
							</span>
						)}
					</div>
					<div className='flex gap-2'>
						<HandDrawnButton
							variant='outline'
							onClick={toggleRepoSettings}
							className='flex items-center gap-2'
						>
							<Settings className='h-4 w-4' />
							Settings
						</HandDrawnButton>
						<HandDrawnButton
							variant='outline'
							onClick={handleRefresh}
							disabled={isLoading}
							className='flex items-center gap-2'
						>
							<RefreshCw className='h-4 w-4' />
							Refresh
						</HandDrawnButton>
						<HandDrawnButton
							variant='outline'
							onClick={handleLogout}
							disabled={isLoading}
							className='flex items-center gap-2'
						>
							<LogOut className='h-4 w-4' />
							Logout
						</HandDrawnButton>
					</div>
				</div>

				{showRepoSettings && stats?.allRepositories && (
					<HandDrawnCard className='mb-6'>
						<div className='flex justify-between items-center mb-4'>
							<h3 className='text-xl font-handwritten'>Repository Settings</h3>
							<HandDrawnButton
								variant='ghost'
								size='sm'
								onClick={toggleRepoSettings}
								className='text-pencil'
							>
								<X className='h-4 w-4' />
							</HandDrawnButton>
						</div>
						<p className='text-sm text-pencil mb-4'>
							Select which repositories to include in your stats:
						</p>
						<div className='flex items-center justify-between mb-4 px-2 font-handwritten'>
							<span>
								<Lock className='inline h-4 w-4 mr-1' />
								All GitHub activity now counted!
							</span>
							<span className='text-xs text-pencil'>
								(Your complete contribution history is included)
							</span>
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2'>
							{stats.allRepositories.map((repo) => (
								<div
									key={repo.name}
									className='flex items-center justify-between border border-pencil-light rounded-lg p-2'
								>
									<div className='flex items-center truncate mr-2'>
										<span className='truncate'>{repo.name}</span>
										{repo.isPrivate && (
											<Lock className='ml-1 h-3 w-3 text-pencil' />
										)}
									</div>
									<HandDrawnButton
										variant={repo.isTracked ? 'default' : 'outline'}
										size='sm'
										onClick={() =>
											handleToggleRepository(repo.name, !repo.isTracked)
										}
										disabled={togglingRepo === repo.name}
										className={cn(
											repo.isTracked ? 'bg-ink-blue text-white' : '',
											'w-[120px]'
										)}
									>
										{togglingRepo === repo.name ? (
											'Saving...'
										) : repo.isTracked ? (
											<>
												<Check className='h-4 w-4 mr-1' /> Tracking
											</>
										) : (
											<>
												<X className='h-4 w-4 mr-1' /> Not Tracking
											</>
										)}
									</HandDrawnButton>
								</div>
							))}
						</div>
						<div className='flex justify-end mt-4'>
							<HandDrawnButton
								onClick={handleRefresh}
								className='flex items-center gap-2'
							>
								<RefreshCw className='h-4 w-4' />
								Apply & Refresh
							</HandDrawnButton>
						</div>
					</HandDrawnCard>
				)}

				{isLoading ? (
					<div className='space-y-6'>
						<HandDrawnCard className='p-6'>
							<div className='space-y-4'>
								<Skeleton className='h-8 w-3/4' />
								<Skeleton className='h-24 w-full' />
								<Skeleton className='h-4 w-1/2' />
							</div>
						</HandDrawnCard>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<HandDrawnCard className='p-6'>
								<Skeleton className='h-6 w-1/3 mb-4' />
								<div className='space-y-2'>
									<Skeleton className='h-4 w-full' />
									<Skeleton className='h-4 w-2/3' />
								</div>
							</HandDrawnCard>
							<HandDrawnCard className='p-6'>
								<Skeleton className='h-6 w-1/3 mb-4' />
								<div className='space-y-2'>
									<Skeleton className='h-4 w-full' />
									<Skeleton className='h-4 w-2/3' />
								</div>
							</HandDrawnCard>
						</div>
					</div>
				) : stats ? (
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<HandDrawnCard variant='notebook' className='md:col-span-2'>
							<h2 className='text-2xl font-handwritten mb-2'>
								{getSlackingMessage()}
							</h2>
							<CommitMeter
								value={stats.recentCommits}
								maxValue={DAILY_GOAL}
								className='my-8'
							/>
							<p className='text-pencil italic mt-4'>
								Based on your recent commit activity and contribution patterns
							</p>
						</HandDrawnCard>

						<HandDrawnCard>
							<div className='flex items-start justify-between'>
								<div>
									<h3 className='text-xl font-handwritten mb-2'>
										Commit Stats
									</h3>
									<ul className='space-y-2'>
										<li className='flex items-center'>
											<GitCommit className='w-5 h-5 mr-2 text-ink-blue' />
											<span>{stats.totalCommits} total contributions</span>
										</li>
										<li className='flex items-center'>
											<Clock className='w-5 h-5 mr-2 text-ink-blue' />
											<span>{stats.recentCommits} commits this month</span>
										</li>
										<li className='mt-4'>
											<div className='text-sm mb-1 font-medium'>
												Today's Goal: {stats.commitsToday || 0} / {DAILY_GOAL}
											</div>
											<div className='w-full bg-pencil-light rounded-full h-2.5'>
												<div
													className='bg-ink-blue h-2.5 rounded-full'
													style={{
														width: `${Math.min(
															100,
															((stats.commitsToday || 0) / DAILY_GOAL) * 100
														)}%`,
													}}
												></div>
											</div>
										</li>
									</ul>
								</div>
								<div className='text-6xl font-handwritten text-ink-blue'>
									{stats.totalCommits}
								</div>
							</div>
						</HandDrawnCard>

						<HandDrawnCard>
							<div className='flex items-start justify-between'>
								<div>
									<h3 className='text-xl font-handwritten mb-2'>Streak</h3>
									<p>{getStreakMessage()}</p>
								</div>
								<div className='flex flex-col items-end'>
									<div className='text-6xl font-handwritten text-ink-red'>
										{stats.streakDays}
									</div>
									<div className='flex items-center text-sm mt-1'>
										<span className='mr-1 text-red-500'>❤️</span>
										<span>{stats.lives ?? '-'} Lives</span>
									</div>
								</div>
							</div>
							<div className='flex items-center mt-4'>
								<Calendar className='w-5 h-5 mr-2 text-ink-red' />
								<span>
									Last commit:{' '}
									{stats?.lastCommitDate === 'The Last Supper'
										? 'The Last Supper'
										: stats?.lastCommitDate
										? format(new Date(stats.lastCommitDate), 'MMM d, yyyy')
										: 'N/A'}
								</span>
							</div>
						</HandDrawnCard>

						<HandDrawnCard className='md:col-span-2'>
							<div className='flex justify-between items-center mb-4'>
								<h3 className='text-xl font-handwritten'>Recent Activity</h3>
								{stats.allRepositories && (
									<HandDrawnButton
										variant='ghost'
										size='sm'
										onClick={toggleRepoSettings}
										className='text-pencil flex items-center'
									>
										<Settings className='h-4 w-4 mr-1' />
										Manage Repos
									</HandDrawnButton>
								)}
							</div>
							<div className='space-y-4'>
								{stats.recentActivity.length > 0 ? (
									stats.recentActivity.map(
										(activity: ActivityEvent, index: number) => (
											<div key={index} className='group'>
												{index > 0 && (
													<Separator className='my-4 border-pencil-light' />
												)}
												<div className='flex justify-between items-start'>
													<div>
														<p className='font-medium'>{activity.summary}</p>
														<p className='text-sm text-pencil'>
															{format(new Date(activity.date), 'MMM d, h:mm a')}
														</p>
													</div>
													{activity.url && (
														<a
															href={activity.url}
															target='_blank'
															rel='noopener noreferrer'
															className='text-ink-blue hover:underline flex items-center group-hover:opacity-100 opacity-0 transition-opacity'
														>
															View <ArrowUpRight className='w-4 h-4 ml-1' />
														</a>
													)}
												</div>
											</div>
										)
									)
								) : (
									<p className='text-center text-pencil italic'>
										No recent activity in the tracked repositories.
										<HandDrawnButton
											variant='link'
											size='sm'
											onClick={toggleRepoSettings}
											className='ml-2'
										>
											Add repositories
										</HandDrawnButton>
									</p>
								)}
							</div>
						</HandDrawnCard>

						{stats.topRepos.length > 0 && (
							<HandDrawnCard className='md:col-span-2'>
								<h3 className='text-xl font-handwritten mb-4'>
									Top Repositories
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
									{stats.topRepos.map((repo) => (
										<div
											key={repo.name}
											className='border border-pencil-light rounded-lg p-4'
										>
											<h4 className='font-medium truncate'>{repo.name}</h4>
											<p className='text-sm text-pencil'>
												{repo.commits} commits
											</p>
										</div>
									))}
								</div>
							</HandDrawnCard>
						)}
					</div>
				) : (
					<HandDrawnCard className='text-center py-12'>
						<div className='font-handwritten text-xl'>
							Couldn't load your GitHub stats, bro! Try refreshing.
						</div>
						<HandDrawnButton onClick={handleRefresh} className='mt-4'>
							<RefreshCw className='h-4 w-4 mr-2' />
							Try Again
						</HandDrawnButton>
					</HandDrawnCard>
				)}
			</div>
		</div>
	);
};

export default Dashboard;
