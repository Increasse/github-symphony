import { useRef, useCallback, useEffect, useState } from 'react';
import type {MusicalNote} from '../types/github';

interface AudioConfig {
    volume: number;        // Громкость (0-1)
    attackTime: number;    // Время атаки (сек)
    releaseTime: number;   // Время затухания (сек)
    baseFrequency: number; // Базовая частота (Гц)
}

interface UseAudioSynthesisReturn {
    isPlaying: boolean;
    currentNote: MusicalNote | null;
    playNote: (note: MusicalNote) => Promise<void>;
    playSymphony: (notes: MusicalNote[], onNoteEnd?: (index: number) => void) => Promise<void>;
    stopSymphony: () => void;
    setVolume: (volume: number) => void;
    isAudioEnabled: boolean;
    toggleAudio: () => void;
}

const NOTES = {
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.00,
    A4: 440.00,
    B4: 493.88,
    C5: 523.25,
};

function commitCountToFrequency(commitCount: number, maxCommits: number): number {
    const noteIndex = Math.floor((commitCount / maxCommits) * 7);
    const notesArray = Object.values(NOTES);
    return notesArray[Math.min(noteIndex, notesArray.length - 1)];
}

function durationToLength(durationMs: number): number {
    return Math.min(Math.max(durationMs / 1000, 0.2), 2);
}

export function useAudioSynthesis(maxCommitsPerDay: number = 1): UseAudioSynthesisReturn {
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentOscillatorRef = useRef<OscillatorNode | null>(null);
    const currentGainRef = useRef<GainNode | null>(null);
    const isPlayingRef = useRef<boolean>(false);
    const stopRequestedRef = useRef<boolean>(false);

    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentNote, setCurrentNote] = useState<MusicalNote | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

    const configRef = useRef<AudioConfig>({
        volume: 0.3,
        attackTime: 0.01,
        releaseTime: 0.3,
        baseFrequency: 261.63,
    });

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        return audioContextRef.current;
    }, []);

    // Синтез одной ноты
    const playNote = useCallback(async (note: MusicalNote) => {
        if (!isAudioEnabled) return;

        try {
            const audioContext = initAudioContext();

            if (currentOscillatorRef.current) {
                currentOscillatorRef.current.stop();
                currentOscillatorRef.current.disconnect();
                currentOscillatorRef.current = null;
            }

            if (currentGainRef.current) {
                currentGainRef.current.disconnect();
                currentGainRef.current = null;
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Выбираем тип волны в зависимости от количества коммитов
            if (note.commitCount > 10) {
                oscillator.type = 'sawtooth';
            } else if (note.commitCount > 5) {
                oscillator.type = 'square';
            } else {
                oscillator.type = 'sine';
            }

            // Вычисляем частоту на основе количества коммитов
            const frequency = commitCountToFrequency(note.commitCount, maxCommitsPerDay);
            oscillator.frequency.value = frequency;

            // Длительность ноты на основе времени до следующего коммита
            const duration = durationToLength(note.duration);

            // Настройка огибающей
            const now = audioContext.currentTime;
            const attack = configRef.current.attackTime;
            const release = configRef.current.releaseTime;

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(configRef.current.volume, now + attack);
            gainNode.gain.setValueAtTime(configRef.current.volume, now + duration - release);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(now + duration);

            currentOscillatorRef.current = oscillator;
            currentGainRef.current = gainNode;

            setCurrentNote(note);

            // Возвращаем промис, который разрешится после окончания ноты
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    if (currentOscillatorRef.current === oscillator) {
                        currentOscillatorRef.current = null;
                        currentGainRef.current = null;
                    }
                    resolve();
                }, duration * 1000);
            });

        } catch (error) {
            console.error('Ошибка при воспроизведении ноты:', error);
        }
    }, [isAudioEnabled, initAudioContext, maxCommitsPerDay]);

    // Воспроизведение всей симфонии
    const playSymphony = useCallback(async (notes: MusicalNote[], onNoteEnd?: (index: number) => void) => {
        if (isPlayingRef.current) {
            console.warn('Симфония уже играет');
            return;
        }

        stopRequestedRef.current = false;
        setIsPlaying(true);
        isPlayingRef.current = true;

        try {
            const audioContext = initAudioContext();

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            for (let i = 0; i < notes.length; i++) {
                if (stopRequestedRef.current) {
                    console.log('Воспроизведение остановлено пользователем');
                    break;
                }

                const note = notes[i];

                if (note.commitCount === 0) continue;

                setCurrentNote(note);

                await playNote(note);

                onNoteEnd?.(i);

                await new Promise(resolve => setTimeout(resolve, 25));
            }

        } catch (error) {
            console.error('Ошибка при воспроизведении симфонии:', error);
        } finally {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setCurrentNote(null);
            stopRequestedRef.current = false;
        }
    }, [playNote, initAudioContext]);

    // Остановка симфонии
    const stopSymphony = useCallback(() => {
        stopRequestedRef.current = true;

        if (currentOscillatorRef.current) {
            try {
                currentOscillatorRef.current.stop();
                currentOscillatorRef.current.disconnect();
            } catch (e) {
                //
            }
            currentOscillatorRef.current = null;
        }

        if (currentGainRef.current) {
            currentGainRef.current.disconnect();
            currentGainRef.current = null;
        }

        setIsPlaying(false);
        isPlayingRef.current = false;
        setCurrentNote(null);
    }, []);

    const setVolume = useCallback((volume: number) => {
        configRef.current.volume = Math.min(Math.max(volume, 0), 1);

        if (currentGainRef.current && audioContextRef.current) {
            const now = audioContextRef.current.currentTime;
            currentGainRef.current.gain.linearRampToValueAtTime(configRef.current.volume, now + 0.05);
        }
    }, []);

    const toggleAudio = useCallback(() => {
        if (isAudioEnabled) {
            if (currentGainRef.current && audioContextRef.current) {
                const now = audioContextRef.current.currentTime;
                currentGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05);
            }
            setIsAudioEnabled(false);
        } else {
            setIsAudioEnabled(true);
        }
    }, [isAudioEnabled]);

    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    return {
        isPlaying,
        currentNote,
        playNote,
        playSymphony,
        stopSymphony,
        setVolume,
        isAudioEnabled,
        toggleAudio,
    };
}