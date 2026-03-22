import {useState, useMemo} from 'react';
import {useAppStore} from './store/appStore';
import {useGitHubData} from './hooks/useGitHubData';
import {useAudioSynthesis} from './hooks/useAudioSynthesis';
import ScoreCanvas from './components/Visualization/ScoreCanvas';
import AudioPlayer from './components/AudioPlayer/AudioPlayer';

function App() {
    const {
        githubToken,
        setGithubToken,
        currentRepo,
        setCurrentRepo,
        error,
        setError
    } = useAppStore();

    const [tokenInput, setTokenInput] = useState('');
    const [repoInput, setRepoInput] = useState('');
    const [selectedNote, setSelectedNote] = useState<any>(null);

    const {
        data,
        isLoading,
        error: queryError,
        isError
    } = useGitHubData(
        currentRepo?.owner || '',
        currentRepo?.name || ''
    );

    const maxCommitsPerDay = useMemo(() => {
        if (!data?.musicalNotes) return 1;
        return Math.max(...data.musicalNotes.map(n => n.commitCount), 1);
    }, [data]);

    const {
        isPlaying,
        currentNote,
        playNote,
        playSymphony,
        stopSymphony,
        setVolume,
        isAudioEnabled,
        toggleAudio,
    } = useAudioSynthesis(maxCommitsPerDay);

    const handleSaveToken = () => {
        if (tokenInput.trim()) {
            setGithubToken(tokenInput.trim());
            setTokenInput('');
            setError(null);
        }
    };

    const handleClearToken = () => {
        setGithubToken(null);
        setCurrentRepo(null);
        setSelectedNote(null);
        stopSymphony();
    };

    const handleSearchRepo = () => {
        if (!repoInput.trim()) return;

        const parts = repoInput.trim().split('/');
        if (parts.length !== 2) {
            setError('Неверный формат. Используйте: владелец/репозиторий');
            return;
        }

        setCurrentRepo({owner: parts[0], name: parts[1]});
        setError(null);
        setSelectedNote(null);
        stopSymphony();
    };

    const handleNoteClick = (note: any) => {
        setSelectedNote(note);
        if (!isPlaying && isAudioEnabled) {
            playNote(note);
        }
    };

    const handlePlaySymphony = () => {
        if (data?.musicalNotes && data.musicalNotes.length > 0) {
            playSymphony(data.musicalNotes, (index) => {
                console.log(`Сыграна нота ${index + 1}`);
            });
        }
    };

    return (
        <div className="min-h-screen bg-symphony-dark p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-symphony-purple to-symphony-gold bg-clip-text text-transparent">
                        GitHub Symphony
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Превращаем историю коммитов в музыку и визуализацию
                    </p>
                </header>

                <div className="bg-gray-900 rounded-lg p-6 mb-6 shadow-xl">
                    <h2 className="text-xl font-semibold mb-4 text-symphony-gold">
                        GitHub Token
                    </h2>

                    {!githubToken ? (
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveToken()}
                                placeholder="Введите Personal Access Token"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-symphony-purple transition-colors"
                            />
                            <button
                                onClick={handleSaveToken}
                                className="bg-symphony-purple hover:bg-purple-700 px-6 py-2 rounded font-semibold transition-colors"
                            >
                                Сохранить
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-400">Токен установлен</span>
                            </div>
                            <button
                                onClick={handleClearToken}
                                className="text-red-400 hover:text-red-300 text-sm transition-colors"
                            >
                                Очистить
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                        Токен нужен для доступа к GitHub API. Требуются права: <code
                        className="text-symphony-purple">repo</code>
                    </p>
                </div>

                {githubToken && (
                    <div className="bg-gray-900 rounded-lg p-6 mb-6 shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 text-symphony-gold">
                            Репозиторий
                        </h2>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={repoInput}
                                onChange={(e) => setRepoInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchRepo()}
                                placeholder="owner/repository (например: facebook/react)"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-symphony-purple transition-colors"
                            />
                            <button
                                onClick={handleSearchRepo}
                                disabled={isLoading}
                                className="bg-symphony-purple hover:bg-purple-700 px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Загрузка...' : 'Загрузить'}
                            </button>
                        </div>

                        {currentRepo && (
                            <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
                                <span className="text-gray-400">Текущий репозиторий: </span>
                                <span className="text-symphony-purple font-mono">
                  {currentRepo.owner}/{currentRepo.name}
                </span>
                            </div>
                        )}

                        {(error || (isError && queryError)) && (
                            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
                                ⚠️ {error || (queryError as Error)?.message || 'Ошибка загрузки данных'}
                            </div>
                        )}
                    </div>
                )}

                {currentRepo && data && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
                            <h2 className="text-xl font-semibold mb-4 text-symphony-gold">
                                Симфония коммитов
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-symphony-purple">
                                        {data.totalCommits}
                                    </div>
                                    <div className="text-sm text-gray-400">Всего коммитов</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-symphony-gold">
                                        {data.musicalNotes.length}
                                    </div>
                                    <div className="text-sm text-gray-400">Дней с коммитами</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-sm font-mono text-gray-300">
                                        {data.dateRange.start?.toLocaleDateString()} - {data.dateRange.end?.toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-gray-400">Период</div>
                                </div>
                            </div>

                            <ScoreCanvas
                                notes={data.musicalNotes}
                                onNoteClick={handleNoteClick}
                            />

                            <div className="mt-6">
                                <AudioPlayer
                                    isPlaying={isPlaying}
                                    currentNote={currentNote || selectedNote || data.musicalNotes[0]}
                                    onPlaySymphony={handlePlaySymphony}
                                    onStopSymphony={stopSymphony}
                                    onPlayNote={playNote}
                                    onVolumeChange={setVolume}
                                    isAudioEnabled={isAudioEnabled}
                                    onToggleAudio={toggleAudio}
                                    notesCount={data.musicalNotes.length}
                                />
                            </div>
                        </div>

                        {selectedNote && (
                            <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
                                <h3 className="font-semibold mb-3 text-symphony-gold">
                                    Выбранный день: {selectedNote.day.toLocaleDateString('ru-RU')}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-800 rounded p-3">
                                        <div className="text-xs text-gray-400">Коммитов</div>
                                        <div className="text-xl font-bold text-white">{selectedNote.commitCount}</div>
                                    </div>
                                    <div className="bg-gray-800 rounded p-3">
                                        <div className="text-xs text-gray-400">Доминирующий язык</div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{backgroundColor: selectedNote.languageColor}}
                                            />
                                            <span className="text-white">{selectedNote.language}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-800 rounded p-3">
                                        <div className="text-xs text-gray-400">Длительность (аудио)</div>
                                        <div className="text-white">
                                            {(Math.min(Math.max(selectedNote.duration / 1000, 0.2), 2)).toFixed(1)} сек
                                        </div>
                                    </div>
                                    <div className="bg-gray-800 rounded p-3">
                                        <div className="text-xs text-gray-400">Сообщения</div>
                                        <div className="text-white text-sm truncate">
                                            {selectedNote.commits[0]?.message.slice(0, 30)}...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
                            <h3 className="font-semibold mb-3 text-symphony-gold">
                                Тепловая карта активности по часам
                            </h3>
                            <div className="flex gap-1 flex-wrap">
                                {data.hourlyHeatmap.map((hour, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 text-center p-2 rounded min-w-[40px]"
                                        style={{
                                            backgroundColor: `rgba(139, 92, 246, ${hour.intensity * 0.8 + 0.2})`,
                                        }}
                                        title={`${hour.hour}:00 - ${hour.commitCount} коммитов`}
                                    >
                                        <div className="text-xs text-gray-300">{hour.hour}</div>
                                        <div className="text-sm font-bold text-white">{hour.commitCount}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-center text-xs text-gray-500">
                                Совы (вечер) &nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp; Жаворонки (утро)
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && currentRepo && (
                    <div className="bg-gray-900 rounded-lg p-6 shadow-xl mt-6">
                        <div className="flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-symphony-purple"></div>
                            <span className="text-gray-400">Загрузка коммитов из GitHub...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;