import React, { useState } from 'react';
import type {MusicalNote} from '../../types/github';

interface AudioPlayerProps {
    isPlaying: boolean;
    currentNote: MusicalNote | null;
    onPlaySymphony: () => void;
    onStopSymphony: () => void;
    onPlayNote: (note: MusicalNote) => void;
    onVolumeChange: (volume: number) => void;
    isAudioEnabled: boolean;
    onToggleAudio: () => void;
    notesCount: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
                                                     isPlaying,
                                                     currentNote,
                                                     onPlaySymphony,
                                                     onStopSymphony,
                                                     onPlayNote,
                                                     onVolumeChange,
                                                     isAudioEnabled,
                                                     onToggleAudio,
                                                     notesCount,
                                                 }) => {
    const [volume, setVolumeState] = useState(0.3);
    const [isPlayingNote, setIsPlayingNote] = useState(false);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolumeState(newVolume);
        onVolumeChange(newVolume);
    };

    const handlePlayNote = () => {
        if (currentNote && !isPlaying) {
            setIsPlayingNote(true);
            onPlayNote(currentNote);
            setTimeout(() => setIsPlayingNote(false), 250);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-symphony-gold font-semibold flex items-center gap-2">
                    Аудио-синтезатор
                </h3>

                <button
                    onClick={onToggleAudio}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                        isAudioEnabled
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    {isAudioEnabled ? '🔊 Звук включён' : '🔇 Звук выключен'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <button
                            onClick={onPlaySymphony}
                            disabled={isPlaying || notesCount === 0 || !isAudioEnabled}
                            className="flex-1 bg-symphony-purple hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            {isPlaying ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Играет...
                                </>
                            ) : (
                                '▶️ Сыграть симфонию'
                            )}
                        </button>

                        <button
                            onClick={onStopSymphony}
                            disabled={!isPlaying}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold transition-colors"
                        >
                            ⏹️ Стоп
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handlePlayNote}
                            disabled={!currentNote || isPlaying || !isAudioEnabled}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors text-sm"
                        >
                            {isPlayingNote ? 'Играет...' : 'Сыграть выбранную ноту'}
                        </button>
                    </div>

                    {currentNote && (
                        <div className="text-xs text-gray-400 bg-gray-900 rounded p-2">
                            <span className="text-symphony-gold">Текущая нота:</span>{' '}
                            {currentNote.day.toLocaleDateString()} — {currentNote.commitCount} коммитов
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">
                            Громкость: {Math.round(volume * 100)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-symphony-purple"
                        />
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                        <p>Как это работает:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                            <li>Высота ноты = количество коммитов</li>
                            <li>Длительность = время до следующего коммита</li>
                            <li>Тембр зависит от активности дня</li>
                        </ul>
                    </div>
                </div>
            </div>
\
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                <span>Всего нот: {notesCount}</span>
                <span className="text-symphony-purple">
          {isPlaying ? 'Симфония играет...' : isAudioEnabled ? '⏸ Готов к воспроизведению' : '🔇 Звук отключён'}
        </span>
            </div>
        </div>
    );
};

export default AudioPlayer;