import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {MusicalNote} from '../../types/github';

interface ScoreCanvasProps {
    notes: MusicalNote[];
    width?: number;
    height?: number;
    onNoteClick?: (note: MusicalNote, index: number) => void;
}

const ScoreCanvas: React.FC<ScoreCanvasProps> = ({
                                                     notes,
                                                     width = 800,
                                                     height = 400,
                                                     onNoteClick
                                                 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredNote, setHoveredNote] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const padding = { top: 60, right: 40, bottom: 60, left: 80 };
    const drawingWidth = width - padding.left - padding.right;
    const maxCommitsPerDay = Math.max(...notes.map(n => n.commitCount), 1);

    const staffTop = padding.top + 20;
    const staffBottom = height - padding.bottom - 40;
    const staffHeight = staffBottom - staffTop;

    const commitCountToY = useCallback((commitCount: number): number => {
        const minY = staffTop + 8;
        const maxY = staffBottom - 8;
        const availableHeight = maxY - minY;

        const normalizedHeight = 1 - (commitCount / maxCommitsPerDay);
        return minY + (normalizedHeight * availableHeight);
    }, [maxCommitsPerDay, staffTop, staffBottom]);

    const getXPosition = useCallback((index: number): number => {
        const noteWidth = drawingWidth / notes.length;
        const offset = noteWidth / 2;
        return padding.left + (index * noteWidth) + offset;
    }, [drawingWidth, notes.length, padding.left]);

    // Отрисовка нотного стана
    const drawStaff = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;

        const lineSpacing = staffHeight / 4;
        for (let i = 0; i < 5; i++) {
            const y = staffTop + (i * lineSpacing);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 0.5;
        const measuresCount = Math.min(notes.length, 20);
        for (let i = 0; i <= measuresCount; i++) {
            const x = padding.left + (drawingWidth / measuresCount) * i;
            ctx.beginPath();
            ctx.moveTo(x, staffTop - 10);
            ctx.lineTo(x, staffBottom + 10);
            ctx.stroke();
        }

        ctx.restore();
    }, [padding, width, staffTop, staffBottom, drawingWidth, notes.length]);

    const drawTrebleClef = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.font = `bold ${staffHeight * 0.4}px "Times New Roman", serif`;
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 0;
        ctx.fillText('𝄞', padding.left - 25, staffTop + staffHeight * 0.2);
        ctx.restore();
    }, [padding.left, staffTop, staffHeight]);

    // Отрисовка нот
    const drawNotes = useCallback((ctx: CanvasRenderingContext2D) => {
        notes.forEach((note, index) => {
            const x = getXPosition(index);
            const y = commitCountToY(note.commitCount);
            const isHovered = hoveredNote === index;

            const baseSize = 4;
            const noteSize = Math.min(baseSize + note.commitCount * 0.3, 12);
            const noteWidth = noteSize * 0.7;
            const noteHeight = noteSize;

            ctx.save();

            if (isHovered) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = note.languageColor;
            }

            ctx.beginPath();
            ctx.ellipse(x, y, noteWidth, noteHeight, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = note.languageColor;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (note.commitCount > 3) {
                ctx.beginPath();
                ctx.moveTo(x + noteWidth, y - noteHeight * 0.25);
                ctx.lineTo(x + noteWidth, y - noteHeight * 2.5);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.restore();
        });
    }, [notes, getXPosition, commitCountToY, hoveredNote]);

    const drawDateLabels = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.fillStyle = '#9ca3af';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';

        const step = Math.max(1, Math.floor(notes.length / 15));

        notes.forEach((note, index) => {
            if (index % step === 0 || index === notes.length - 1) {
                const x = getXPosition(index);
                const dateStr = note.day.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short'
                });

                ctx.fillStyle = '#9ca3af';
                ctx.fillText(dateStr, x, height - padding.bottom + 15);
            }
        });

        ctx.restore();
    }, [notes, getXPosition, commitCountToY, height, padding.bottom]);

    // Отрисовка легенды языков
    const drawLanguageLegend = useCallback((ctx: CanvasRenderingContext2D) => {
        const languages = new Map<string, { color: string; count: number }>();
        notes.forEach(note => {
            if (!languages.has(note.language)) {
                languages.set(note.language, { color: note.languageColor, count: 0 });
            }
            languages.get(note.language)!.count += note.commitCount;
        });

        const topLanguages = Array.from(languages.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);

        ctx.save();
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';

        const legendX = width - padding.right - 100;
        let legendY = padding.top + 10;

        ctx.fillStyle = '#d1d5db';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('Языки:', legendX, legendY);

        topLanguages.forEach(([lang, data]) => {
            legendY += 18;

            ctx.fillStyle = data.color;
            ctx.fillRect(legendX, legendY - 10, 12, 12);

            ctx.fillStyle = '#9ca3af';
            ctx.font = '9px monospace';
            ctx.fillText(`${lang} (${data.count})`, legendX + 18, legendY);
        });

        ctx.restore();
    }, [notes, width, padding.right, padding.top]);

    const drawScale = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';

        const levels = [0, 0.25, 0.5, 0.75, 1];
        levels.forEach(level => {
            const commitValue = Math.round(maxCommitsPerDay * level);
            const y = commitCountToY(commitValue);

            ctx.fillStyle = '#6b7280';
            ctx.fillText(commitValue.toString(), padding.left - 10, y + 3);

            ctx.beginPath();
            ctx.moveTo(padding.left - 5, y);
            ctx.lineTo(padding.left, y);
            ctx.strokeStyle = '#4a5568';
            ctx.stroke();
        });

        ctx.fillStyle = '#d1d5db';
        ctx.font = 'bold 10px monospace';
        ctx.save();
        ctx.translate(padding.left - 30, staffTop + staffHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Количество коммитов', 0, 0);
        ctx.restore();

        ctx.restore();
    }, [maxCommitsPerDay, commitCountToY, padding.left, staffTop, staffHeight]);

    // Основная функция отрисовки
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        drawStaff(ctx);

        drawTrebleClef(ctx);

        drawNotes(ctx);

        drawDateLabels(ctx);

        drawLanguageLegend(ctx);

        drawScale(ctx);

    }, [width, height, drawStaff, drawTrebleClef, drawNotes, drawDateLabels, drawLanguageLegend, drawScale]);

    // Обработка наведения мыши
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let hoverIndex: number | null = null;
        let hoverX = 0;
        let hoverY = 0;

        for (let i = 0; i < notes.length; i++) {
            const noteX = getXPosition(i);
            const noteY = commitCountToY(notes[i].commitCount);
            const noteSize = 20;

            if (Math.abs(mouseX - noteX) < noteSize && Math.abs(mouseY - noteY) < noteSize) {
                hoverIndex = i;
                hoverX = noteX;
                hoverY = noteY;
                break;
            }
        }

        setHoveredNote(hoverIndex);
        if (hoverIndex !== null) {
            setTooltipPosition({ x: hoverX, y: hoverY - 30 });
        }
    }, [notes, getXPosition, commitCountToY]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        for (let i = 0; i < notes.length; i++) {
            const noteX = getXPosition(i);
            const noteY = commitCountToY(notes[i].commitCount);
            const noteSize = 20;

            if (Math.abs(mouseX - noteX) < noteSize && Math.abs(mouseY - noteY) < noteSize) {
                onNoteClick?.(notes[i], i);
                break;
            }
        }
    }, [notes, getXPosition, commitCountToY, onNoteClick]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas, notes, hoveredNote]);

    useEffect(() => {
        const handleResize = () => {
            drawCanvas();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawCanvas]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-full rounded-lg shadow-2xl cursor-pointer"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredNote(null)}
                onClick={handleClick}
                style={{ width: '100%', height: 'auto' }}
            />

            {hoveredNote !== null && notes[hoveredNote] && (
                <div
                    className="fixed bg-gray-900 border border-symphony-purple rounded-lg p-2 shadow-xl pointer-events-none z-50"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="text-xs text-gray-300 whitespace-nowrap">
                        <div className="font-bold text-symphony-gold">
                            {notes[hoveredNote].day.toLocaleDateString('ru-RU')}
                        </div>
                        <div>Коммитов: {notes[hoveredNote].commitCount}</div>
                        <div>Язык: {notes[hoveredNote].language}</div>
                        <div>Длительность: {(notes[hoveredNote].duration / (1000 * 60 * 60)).toFixed(1)} ч</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoreCanvas;