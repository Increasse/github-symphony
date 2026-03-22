import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Octokit } from '@octokit/rest';
import { useAppStore } from '../store/appStore';
import type {
    ProcessedCommit,
    MusicalNote,
    HourlyActivity
} from '../types/github';

// GraphQL запрос
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

interface RawCommitNode {
    committedDate: string;
    additions: number;
    deletions: number;
    message: string;
    url: string;
    author: {
        name: string;
        email: string;
        date: string;
    } | null;
    repository: {
        primaryLanguage: {
            name: string;
            color: string;
        } | null;
    };
}

interface RawCommitEdge {
    node: RawCommitNode;
    cursor?: string;
}

interface RawPageInfo {
    hasNextPage: boolean;
    endCursor: string;
}

interface RawHistoryResponse {
    repository: {
        defaultBranchRef: {
            target: {
                history: {
                    edges: RawCommitEdge[];
                    pageInfo: RawPageInfo;
                };
            };
        };
    };
}

function processCommits(edges: RawCommitEdge[]): ProcessedCommit[] {
    return edges.map((edge: RawCommitEdge) => {
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

// Функция для преобразования коммитов в ноты (партитуру)
function commitsToMusicalNotes(commits: ProcessedCommit[]): MusicalNote[] {
    const commitsByDay = new Map<string, ProcessedCommit[]>();

    commits.forEach(commit => {
        const dayKey = commit.date.toISOString().split('T')[0];
        if (!commitsByDay.has(dayKey)) {
            commitsByDay.set(dayKey, []);
        }
        commitsByDay.get(dayKey)!.push(commit);
    });

    const notes: MusicalNote[] = [];
    const sortedDays = Array.from(commitsByDay.keys()).sort();

    for (let i = 0; i < sortedDays.length; i++) {
        const day = sortedDays[i];
        const dayCommits = commitsByDay.get(day)!;

        dayCommits.sort((a, b) => a.timestamp - b.timestamp);

        let duration = 24 * 60 * 60 * 1000;

        if (i < sortedDays.length - 1) {
            const nextDay = sortedDays[i + 1];
            const nextDayCommits = commitsByDay.get(nextDay)!;
            const lastCommitTime = dayCommits[dayCommits.length - 1].timestamp;
            const firstNextCommitTime = nextDayCommits[0].timestamp;
            duration = firstNextCommitTime - lastCommitTime;

            const maxDuration = 7 * 24 * 60 * 60 * 1000;
            if (duration > maxDuration) {
                duration = maxDuration;
            }
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

    commits.forEach(commit => {
        hourlyCounts[commit.hour]++;
    });

    const maxCount = Math.max(...hourlyCounts, 1);

    return hourlyCounts.map((count, hour) => ({
        hour,
        commitCount: count,
        intensity: count / maxCount,
    }));
}

// Интерфейс для возвращаемого значения хука
interface GitHubDataResult {
    rawCommits: ProcessedCommit[];
    musicalNotes: MusicalNote[];
    hourlyHeatmap: HourlyActivity[];
    totalCommits: number;
    dateRange: {
        start: Date | undefined;
        end: Date | undefined;
    };
}

// Основной хук для загрузки данных
export function useGitHubData(owner: string, name: string) {
    const { githubToken } = useAppStore();

    const octokit = React.useMemo(() => {
        return new Octokit({
            auth: githubToken || undefined,
        });
    }, [githubToken]);

    const query = useQuery<GitHubDataResult, Error>({
        queryKey: ['github-commits', owner, name],
        queryFn: async (): Promise<GitHubDataResult> => {
            if (!githubToken) {
                throw new Error('GitHub token is required');
            }

            if (!owner || !name) {
                throw new Error('Repository owner and name are required');
            }

            let allCommits: ProcessedCommit[] = [];
            let cursor: string | null = null;
            let hasNextPage = true;
            let fetchCount = 0;
            const MAX_COMMITS = 500;

            console.log(`Начинаем загрузку коммитов для ${owner}/${name}...`);

            while (hasNextPage && allCommits.length < MAX_COMMITS) {
                fetchCount++;

                try {
                    //GraphQL запрос
                    const response = await octokit.graphql<RawHistoryResponse>(
                        COMMITS_QUERY,
                        {
                            owner,
                            repo: name,
                            cursor: cursor || null,
                        }
                    );

                    const history: RawHistoryResponse['repository']['defaultBranchRef']['target']['history'] =
                        response.repository.defaultBranchRef.target.history;

                    const edges: RawCommitEdge[] = history.edges;
                    const pageInfo: RawPageInfo = history.pageInfo;

                    if (!edges || edges.length === 0) {
                        console.log('Нет коммитов на этой странице');
                        break;
                    }

                    const processed: ProcessedCommit[] = processCommits(edges);
                    allCommits = [...allCommits, ...processed];

                    hasNextPage = pageInfo.hasNextPage;
                    cursor = pageInfo.endCursor;

                    console.log(`Загружено ${allCommits.length} коммитов, hasNextPage: ${hasNextPage}`);

                    if (fetchCount > 20) {
                        console.warn('Достигнут лимит запросов (20)');
                        break;
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке страницы коммитов:', error);
                    throw error;
                }
            }

            if (allCommits.length === 0) {
                throw new Error('В этом репозитории нет коммитов или нет доступа');
            }

            allCommits.sort((a, b) => a.timestamp - b.timestamp);

            const musicalNotes: MusicalNote[] = commitsToMusicalNotes(allCommits);
            const hourlyHeatmap: HourlyActivity[] = buildHourlyHeatmap(allCommits);

            console.log(`Загрузка завершена: ${allCommits.length} коммитов, ${musicalNotes.length} дней с коммитами`);

            const result: GitHubDataResult = {
                rawCommits: allCommits,
                musicalNotes,
                hourlyHeatmap,
                totalCommits: allCommits.length,
                dateRange: {
                    start: allCommits[0]?.date,
                    end: allCommits[allCommits.length - 1]?.date,
                },
            };

            return result;
        },
        enabled: !!githubToken && !!owner && !!name,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    return query;
}