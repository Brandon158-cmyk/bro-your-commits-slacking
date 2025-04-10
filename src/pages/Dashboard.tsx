
import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, GitCommit, ArrowUpRight, RefreshCw, LogOut } from "lucide-react";
import { format } from "date-fns";
import { HandDrawnButton } from "@/components/custom/hand-drawn-button";
import { HandDrawnCard } from "@/components/custom/hand-drawn-card";
import { CommitMeter } from "@/components/custom/commit-meter";
import { useGitHub } from "@/contexts/GitHubContext";
import { Separator } from "@/components/ui/separator";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, githubStats, logout, refreshStats } = useGitHub();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const getSlackingMessage = () => {
    if (!githubStats) return "Loading your stats...";
    
    const { recentCommits, streakDays } = githubStats;
    
    if (recentCommits < 5) return "Yo, your GitHub's collecting dust, bro! 🧹";
    if (recentCommits < 10) return "Getting lazy with the commits lately? 😏";
    if (recentCommits < 20) return "Not bad, but your ops are still coding more! 👀";
    return "You're on fire! Keep that commit streak alive! 🔥";
  };

  const getStreakMessage = () => {
    if (!githubStats) return "";
    
    const { streakDays } = githubStats;
    
    if (streakDays === 0) return "No streak? Did you ghost your repos? 👻";
    if (streakDays < 3) return "Baby streak! Let's grow it! 🌱";
    if (streakDays < 7) return "Almost a week! Don't break the chain! ⛓️";
    return "Legendary streak! You're a coding machine! 🤖";
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-handwritten">Your Commit Report</h1>
          <div className="flex gap-2">
            <HandDrawnButton 
              variant="outline" 
              size="sm"
              onClick={refreshStats}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </HandDrawnButton>
            <HandDrawnButton 
              variant="outline" 
              size="sm"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </HandDrawnButton>
          </div>
        </div>

        {isLoading ? (
          <HandDrawnCard className="text-center py-12">
            <div className="animate-pulse font-handwritten text-xl">
              Checking your commit game... Hold up! ⏳
            </div>
          </HandDrawnCard>
        ) : githubStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HandDrawnCard variant="notebook" className="md:col-span-2">
              <h2 className="text-2xl font-handwritten mb-2">{getSlackingMessage()}</h2>
              <CommitMeter 
                value={githubStats.recentCommits} 
                maxValue={30} 
                className="my-8" 
              />
              <p className="text-pencil italic mt-4">
                Based on your recent commit activity and contribution patterns
              </p>
            </HandDrawnCard>

            <HandDrawnCard>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-handwritten mb-2">Commit Stats</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <GitCommit className="w-5 h-5 mr-2 text-ink-blue" />
                      <span>{githubStats.totalCommits} lifetime commits</span>
                    </li>
                    <li className="flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-ink-blue" />
                      <span>{githubStats.recentCommits} commits this month</span>
                    </li>
                  </ul>
                </div>
                <div className="text-6xl font-handwritten text-ink-blue">
                  {githubStats.recentCommits}
                </div>
              </div>
            </HandDrawnCard>

            <HandDrawnCard>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-handwritten mb-2">Streak</h3>
                  <p>{getStreakMessage()}</p>
                </div>
                <div className="text-6xl font-handwritten text-ink-red">
                  {githubStats.streakDays}
                </div>
              </div>
              <div className="flex items-center mt-4">
                <Calendar className="w-5 h-5 mr-2 text-ink-red" />
                <span>
                  Last commit: {format(new Date(githubStats.lastCommitDate), "MMM d, yyyy")}
                </span>
              </div>
            </HandDrawnCard>

            <HandDrawnCard className="md:col-span-2">
              <h3 className="text-xl font-handwritten mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {githubStats.recentActivity.map((commit: any, index: number) => (
                  <div key={commit.sha} className="group">
                    {index > 0 && <Separator className="my-4 border-pencil-light" />}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{commit.message}</p>
                        <p className="text-sm text-pencil">
                          {format(new Date(commit.date), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <a 
                        href={commit.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-ink-blue hover:underline flex items-center group-hover:opacity-100 opacity-0 transition-opacity"
                      >
                        View <ArrowUpRight className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </HandDrawnCard>
          </div>
        ) : (
          <HandDrawnCard className="text-center py-12">
            <div className="font-handwritten text-xl">
              Couldn't load your GitHub stats, bro! Try refreshing.
            </div>
            <HandDrawnButton 
              className="mt-4" 
              onClick={refreshStats}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </HandDrawnButton>
          </HandDrawnCard>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
