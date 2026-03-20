import { useQuery } from '@tanstack/react-query';
import { Octokit } from '@octokit/rest';
import { useAppStore } from '../store/appStore';
import type {
    GitHubCommitsResponse,
    ProcessedCommit,
    MusicalNote,
    HourlyActivity
} from '../types/github';

// GraphQL запрос для получения коммитов с метаданными
const COMMITS_QUERY = `
  query GetCommits($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 50, after: $cursor) {
              edges {
                node {
                  committedDate
                  additions
                  deletions
                  message
                  url
                  author {
                    name
                    email
                    date
                  }
                  repository {
                    primaryLanguage {
                      name
                      color
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    }
  }
`;

function processCommits(commits: GitHubCommitsResponse['repository']['defaultBranchRef']['target']['history']['edges']): ProcessedCommit[] {
    return commits.map(edge => {
        const commit = edge.node;
        const date = new Date(commit.committedDate);

        return {
            date,
            timestamp: date.getTime(),
            additions: commit.additions,
            deletions: commit.deletions,
            message: commit.message,
            url: commit.url,
            language: commit.repository.primaryLanguage?.name || 'Unknown',
            languageColor: commit.repository.primaryLanguage?.color || '#808080',
            authorName: commit.author?.name || 'Unknown',
            hour: date.getHours(),
            dayOfWeek: date.getDay(),
            files: [],
        };
    });
}

// Функция для преобразования коммитов в ноты
function commitsToMusicalNotes(commits: ProcessedCommit[]): MusicalNote[] {
    const commitsByDay = new Map<string, ProcessedCommit[]>();

    commits.forEach(commit => {
        const dayKey = commit.date.toISOString().split('T')[0];
        if (!commitsByDay.has(dayKey)) {
            commitsByDay.set(dayKey, []);
        }
        commitsByDay.get(dayKey)!.push(commit);
    });

    // Преобразуем дни в ноты
    const notes: MusicalNote[] = [];
    const sortedDays = Array.from(commitsByDay.keys()).sort();

    for (let i = 0; i < sortedDays.length; i++) {
        const day = sortedDays[i];
        const dayCommits = commitsByDay.get(day)!;

        dayCommits.sort((a, b) => a.timestamp - b.timestamp);

        let duration = 24 * 60 * 60 * 1000; // дефолт 24 часа

        if (i < sortedDays.length - 1) {
            const nextDay = sortedDays[i + 1];
            const nextDayCommits = commitsByDay.get(nextDay)!;
            const lastCommitTime = dayCommits[dayCommits.length - 1].timestamp;
            const firstNextCommitTime = nextDayCommits[0].timestamp;
            duration = firstNextCommitTime - lastCommitTime;
        }

        const languageStats = new Map<string, { count: number; color: string }>();
        dayCommits.forEach(commit => {
            const lang = commit.language;
            if (!languageStats.has(lang)) {
                languageStats.set(lang, { count: 0, color: commit.languageColor });
            }
            languageStats.get(lang)!.count++;
        });

        let dominantLanguage = 'Unknown';
        let dominantColor = '#808080';
        let maxCount = 0;

        languageStats.forEach((stats, lang) => {
            if (stats.count > maxCount) {
                maxCount = stats.count;
                dominantLanguage = lang;
                dominantColor = stats.color;
            }
        });

        notes.push({
            day: new Date(day),
            commitCount: dayCommits.length,
            duration,
            language: dominantLanguage,
            languageColor: dominantColor,
            commits: dayCommits,
        });
    }

    return notes;
}

function buildHourlyHeatmap(commits: ProcessedCommit[]): HourlyActivity[] {
    const hourlyCounts = new Array(24).fill(0);
    const maxCount = Math.max(...hourlyCounts);

    commits.forEach(commit => {
        hourlyCounts[commit.hour]++;
    });

    return hourlyCounts.map((count, hour) => ({
        hour,
        commitCount: count,
        intensity: maxCount > 0 ? count / maxCount : 0,
    }));
}

export function useGitHubData(owner: string, name: string) {
    const { githubToken } = useAppStore();

    const octokit = new Octokit({
        auth: githubToken || undefined,
    });

    const query = useQuery({
        queryKey: ['github-commits', owner, name],
        queryFn: async () => {
            if (!githubToken) {
                throw new Error('GitHub token is required');
            }

            let allCommits: ProcessedCommit[] = [];
            let cursor: string | null = null;
            let hasNextPage = true;
            let fetchCount = 0;
            const MAX_COMMITS = 500;

            while (hasNextPage && allCommits.length < MAX_COMMITS) {
                fetchCount++;

                // GraphQL запрос
                const response = await octokit.graphql<GitHubCommitsResponse>(
                    COMMITS_QUERY,
                    {
                        owner,
                        repo: name,
                        cursor: cursor || null,
                    }
                );

                const edges = response.repository.defaultBranchRef.target.history.edges;
                const processed = processCommits(edges);
                allCommits = [...allCommits, ...processed];

                const pageInfo = response.repository.defaultBranchRef.target.history.pageInfo;
                hasNextPage = pageInfo.hasNextPage;
                cursor = pageInfo.endCursor;

                if (fetchCount > 20) break;
            }

            allCommits.sort((a, b) => a.timestamp - b.timestamp);

            const musicalNotes = commitsToMusicalNotes(allCommits);
            const hourlyHeatmap = buildHourlyHeatmap(allCommits);

            return {
                rawCommits: allCommits,
                musicalNotes,
                hourlyHeatmap,
                totalCommits: allCommits.length,
                dateRange: {
                    start: allCommits[0]?.date,
                    end: allCommits[allCommits.length - 1]?.date,
                },
            };
        },
        enabled: !!githubToken && !!owner && !!name,
        staleTime: 5 * 60 * 1000,
        retry: 2,
    });

    return query;
}