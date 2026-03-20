export interface GitHubCommit {
    node: {
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
    };
    cursor?: string;
}

// Тип для ответа GraphQL
export interface GitHubCommitsResponse {
    repository: {
        defaultBranchRef: {
            target: {
                history: {
                    edges: GitHubCommit[];
                    pageInfo: {
                        hasNextPage: boolean;
                        endCursor: string;
                    };
                };
            };
        };
    };
}

export interface ProcessedCommit {
    date: Date;
    timestamp: number;
    additions: number;
    deletions: number;
    message: string;
    url: string;
    language: string;
    languageColor: string;
    authorName: string;
    hour: number;
    dayOfWeek: number;
    files?: string[];
}

// Тип для ноты
export interface MusicalNote {
    day: Date;
    commitCount: number;
    duration: number;
    language: string;
    languageColor: string;
    commits: ProcessedCommit[];
}

// Тип для тепловой карты
export interface HourlyActivity {
    hour: number;
    commitCount: number;
    intensity: number;
}

// Тип для графа зависимостей
export interface FileNode {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'directory';
    weight: number;
}

export interface FileEdge {
    source: string;
    target: string;
    weight: number;
}