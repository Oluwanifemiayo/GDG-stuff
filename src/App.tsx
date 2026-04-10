import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw } from 'lucide-react';

const GRID_SIZE = 20;
const TILE_COUNT = 20;
const CANVAS_SIZE = 400;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

const TRACKS = [
  { id: 1, title: "Neon Drive", artist: "AI Generator Alpha", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "Cybernetic Pulse", artist: "AI Generator Beta", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "Digital Horizon", artist: "AI Generator Gamma", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

export default function App() {
  // Game State (UI)
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);
  
  // Game State (Refs for loop)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const lastProcessedDirectionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef({ x: 5, y: 5 });
  const speedRef = useRef(8);
  const requestRef = useRef<number>();
  const lastRenderTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const isGameRunningRef = useRef(false);

  // Music State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- Game Logic ---

  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
      };
      const onSnake = snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    foodRef.current = newFood;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    directionRef.current = { x: 0, y: -1 };
    lastProcessedDirectionRef.current = { x: 0, y: -1 };
    scoreRef.current = 0;
    setScore(0);
    gameOverRef.current = false;
    setGameOver(false);
    speedRef.current = 8;
    generateFood();
    isGameRunningRef.current = true;
    setIsGameRunning(true);
  }, [generateFood]);

  const updateGame = useCallback(() => {
    if (gameOverRef.current || !isGameRunningRef.current) return;

    const newSnake = [...snakeRef.current];
    const head = { ...newSnake[0] };

    head.x += directionRef.current.x;
    head.y += directionRef.current.y;
    lastProcessedDirectionRef.current = { ...directionRef.current };

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
      gameOverRef.current = true;
      isGameRunningRef.current = false;
      setGameOver(true);
      setIsGameRunning(false);
      return;
    }

    // Self collision
    if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameOverRef.current = true;
      isGameRunningRef.current = false;
      setGameOver(true);
      setIsGameRunning(false);
      return;
    }

    newSnake.unshift(head);

    // Food collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      speedRef.current = Math.min(25, speedRef.current + 0.5);
      generateFood();
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  }, [generateFood]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < TILE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
      ctx.stroke();
    }

    // Draw Food (Neon Pink)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(
      foodRef.current.x * GRID_SIZE + 2,
      foodRef.current.y * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4
    );

    // Draw Snake (Neon Green)
    snakeRef.current.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#66ff4d';
        ctx.shadowBlur = 20;
      } else {
        ctx.fillStyle = '#39ff14';
        ctx.shadowBlur = 10;
      }
      ctx.shadowColor = '#39ff14';
      ctx.fillRect(
        segment.x * GRID_SIZE + 1,
        segment.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      );
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback((currentTime: number) => {
    requestRef.current = requestAnimationFrame(gameLoop);
    
    const secondsSinceLastRender = (currentTime - lastRenderTimeRef.current) / 1000;
    if (secondsSinceLastRender < 1 / speedRef.current) return;
    
    lastRenderTimeRef.current = currentTime;
    updateGame();
    drawGame();
  }, [updateGame, drawGame]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && gameOverRef.current) {
        resetGame();
        return;
      }

      const dir = lastProcessedDirectionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y !== 1) directionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y !== -1) directionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x !== 1) directionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x !== -1) directionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetGame]);

  // Initial draw
  useEffect(() => {
    generateFood();
    drawGame();
  }, [generateFood, drawGame]);

  // --- Music Logic ---

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          console.log("Audio play failed:", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIndex, isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  }, []);

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">
      {/* Background ambient glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          Neon Snake
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-sm uppercase tracking-widest text-cyan-400/70 font-mono">Score</div>
          <div className="text-4xl font-mono font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            {score.toString().padStart(4, '0')}
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="relative group">
          {/* Neon Border Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          
          <div className="relative bg-[#050505] rounded-xl border border-white/10 p-4 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="bg-[#050505] rounded-lg shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"
            />
            
            {/* Overlays */}
            {!isGameRunning && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                <button 
                  onClick={resetGame}
                  className="px-8 py-4 bg-cyan-500/20 border border-cyan-400 text-cyan-400 rounded-full uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
                >
                  Start Game
                </button>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl">
                <h2 className="text-5xl font-black text-fuchsia-500 uppercase tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">Game Over</h2>
                <p className="text-cyan-400 font-mono mb-8 text-lg">Final Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-8 py-4 bg-fuchsia-500/20 border border-fuchsia-500 text-fuchsia-500 rounded-full uppercase tracking-widest font-bold hover:bg-fuchsia-500 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:shadow-[0_0_30px_rgba(217,70,239,0.8)]"
                >
                  <RefreshCw size={20} />
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Music Player */}
      <footer className="relative z-10 bg-[#0a0a0a] border-t border-white/10 backdrop-blur-xl group">
        <audio 
          ref={audioRef} 
          src={TRACKS[currentTrackIndex].url} 
          onEnded={nextTrack}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 transition-all hover:h-2">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)] pointer-events-none"
            style={{ width: `${(progress / duration) * 100 || 0}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="p-4 max-w-4xl mx-auto flex items-center justify-between gap-8">
          {/* Track Info */}
          <div className="flex items-center gap-4 w-1/3">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.4)] shrink-0">
              <div className="w-11 h-11 bg-[#050505] rounded-[5px] flex items-center justify-center">
                <div className={`w-6 h-6 rounded-full border-2 border-cyan-400 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''} border-t-fuchsia-500`} />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate">{TRACKS[currentTrackIndex].title}</h3>
              <p className="text-xs text-white/50 uppercase tracking-wider truncate">{TRACKS[currentTrackIndex].artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 w-1/3">
            <div className="flex items-center gap-6">
              <button onClick={prevTrack} className="text-white/70 hover:text-cyan-400 transition-colors">
                <SkipBack size={24} />
              </button>
              <button 
                onClick={togglePlay} 
                className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all shrink-0"
              >
                {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
              </button>
              <button onClick={nextTrack} className="text-white/70 hover:text-cyan-400 transition-colors">
                <SkipForward size={24} />
              </button>
            </div>
            <div className="text-[10px] font-mono text-white/40 tracking-widest">
              {formatTime(progress)} / {formatTime(duration)}
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-end gap-3 w-1/3">
            <button onClick={() => setIsMuted(!isMuted)} className="text-white/70 hover:text-cyan-400 transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
