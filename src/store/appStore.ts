import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    githubToken: string | null;
    setGithubToken: (token: string | null) => void;

    currentRepo: {
        owner: string;
        name: string;
    } | null;
    setCurrentRepo: (repo: { owner: string; name: string } | null) => void;

    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

    commitsData: any | null;
    setCommitsData: (data: any) => void;

    error: string | null;
    setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Начальные значения
            githubToken: null,
            setGithubToken: (token) => set({ githubToken: token }),

            currentRepo: null,
            setCurrentRepo: (repo) => set({ currentRepo: repo }),

            isLoading: false,
            setIsLoading: (loading) => set({ isLoading: loading }),

            commitsData: null,
            setCommitsData: (data) => set({ commitsData: data }),

            error: null,
            setError: (error) => set({ error }),
        }),
        {
            name: 'github-symphony-storage',
            partialize: (state) => ({
                githubToken: state.githubToken,
                currentRepo: state.currentRepo
            }),
        }
    )
);