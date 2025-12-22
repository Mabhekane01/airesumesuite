import React, { useState, useEffect, useCallback } from "react";
import { FireIcon, StarIcon, BoltIcon } from "@heroicons/react/24/solid";

interface Position {
  x: number;
  y: number;
}

interface GameState {
  dragon: Position[];
  gem: Position;
  direction: Position;
  score: number;
  gameOver: boolean;
  gameStarted: boolean;
  level: number;
  speed: number;
  powerUp: {
    type: "fire" | "speed" | "star" | null;
    position: Position | null;
    active: boolean;
    duration: number;
  };
}

const BOARD_SIZE = 20;
const INITIAL_DRAGON = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };

const DragonSnakeGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    dragon: INITIAL_DRAGON,
    gem: { x: 5, y: 5 },
    direction: INITIAL_DIRECTION,
    score: 0,
    gameOver: false,
    gameStarted: false,
    level: 1,
    speed: 200,
    powerUp: {
      type: null,
      position: null,
      active: false,
      duration: 0,
    },
  });

  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }>
  >([]);

  // Generate random position
  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
  }, []);

  // Create particle effect
  const createParticles = useCallback(
    (x: number, y: number, color: string, count: number = 5) => {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        x: x * 20 + 10,
        y: y * 20 + 10,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color,
      }));
      setParticles((prev) => [...prev, ...newParticles]);
    },
    []
  );

  // Generate power-up
  const generatePowerUp = useCallback(() => {
    if (Math.random() < 0.3) {
      const types: ("fire" | "speed" | "star")[] = ["fire", "speed", "star"];
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        type,
        position: generateRandomPosition(),
        active: false,
        duration: 0,
      };
    }
    return {
      type: null,
      position: null,
      active: false,
      duration: 0,
    };
  }, [generateRandomPosition]);

  // Check collision
  const checkCollision = useCallback(
    (head: Position, body: Position[]): boolean => {
      if (
        head.x < 0 ||
        head.x >= BOARD_SIZE ||
        head.y < 0 ||
        head.y >= BOARD_SIZE
      ) {
        return true;
      }
      return body.some(
        (segment) => segment.x === head.x && segment.y === head.y
      );
    },
    []
  );

  // Move dragon
  const moveDragon = useCallback(() => {
    setGameState((prevState) => {
      if (prevState.gameOver || !prevState.gameStarted) return prevState;
      const head = prevState.dragon[0];
      const newHead = {
        x: head.x + prevState.direction.x,
        y: head.y + prevState.direction.y,
      };

      if (checkCollision(newHead, prevState.dragon)) {
        createParticles(newHead.x, newHead.y, "#ff4444", 8);
        return { ...prevState, gameOver: true };
      }

      let newDragon = [newHead, ...prevState.dragon];
      let newScore = prevState.score;
      let newGem = prevState.gem;
      let newLevel = prevState.level;
      let newSpeed = prevState.speed;
      let newPowerUp = prevState.powerUp;

      if (newHead.x === prevState.gem.x && newHead.y === prevState.gem.y) {
        newScore += 10;
        newGem = generateRandomPosition();
        createParticles(newHead.x, newHead.y, "#22c55e", 6);

        if (newScore > 0 && newScore % 50 === 0) {
          newLevel += 1;
          newSpeed = Math.max(100, newSpeed - 10);
          createParticles(newHead.x, newHead.y, "#fbbf24", 10);
        }

        newPowerUp = generatePowerUp();
      } else {
        newDragon.pop();
      }

      if (
        newPowerUp.position &&
        newHead.x === newPowerUp.position.x &&
        newHead.y === newPowerUp.position.y
      ) {
        newPowerUp = {
          ...newPowerUp,
          active: true,
          duration: 100,
          position: null,
        };
        createParticles(newHead.x, newHead.y, "#10b981", 8);
        newScore += 20;
      }

      if (newPowerUp.active && newPowerUp.duration > 0) {
        newPowerUp = {
          ...newPowerUp,
          duration: newPowerUp.duration - 1,
        };
        if (newPowerUp.duration === 0) {
          newPowerUp = {
            type: null,
            position: null,
            active: false,
            duration: 0,
          };
        }
      }

      return {
        ...prevState,
        dragon: newDragon,
        gem: newGem,
        score: newScore,
        level: newLevel,
        speed: newSpeed,
        powerUp: newPowerUp,
      };
    });
  }, [
    checkCollision,
    generateRandomPosition,
    generatePowerUp,
    createParticles,
  ]);

  // Handle key press
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!gameState.gameStarted || gameState.gameOver) return;
      const { direction } = gameState;
      let newDirection = direction;
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (direction.y === 0) newDirection = { x: 0, y: -1 };
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (direction.y === 0) newDirection = { x: 0, y: 1 };
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (direction.x === 0) newDirection = { x: -1, y: 0 };
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (direction.x === 0) newDirection = { x: 1, y: 0 };
          break;
      }
      setGameState((prev) => ({ ...prev, direction: newDirection }));
    },
    [gameState.gameStarted, gameState.gameOver, gameState.direction]
  );

  // Start game
  const startGame = () => {
    setGameState({
      dragon: INITIAL_DRAGON,
      gem: generateRandomPosition(),
      direction: INITIAL_DIRECTION,
      score: 0,
      gameOver: false,
      gameStarted: true,
      level: 1,
      speed: 200,
      powerUp: {
        type: null,
        position: null,
        active: false,
        duration: 0,
      },
    });
    setParticles([]);
  };

  // Game loop
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;
    const currentSpeed =
      gameState.powerUp.active && gameState.powerUp.type === "speed"
        ? gameState.speed / 2
        : gameState.speed;
    const interval = setInterval(moveDragon, currentSpeed);
    return () => clearInterval(interval);
  }, [
    gameState.gameStarted,
    gameState.gameOver,
    gameState.speed,
    gameState.powerUp,
    moveDragon,
  ]);

  // Particle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 0.02,
            vy: particle.vy + 0.1,
          }))
          .filter((particle) => particle.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  // Get dragon segment style
  const getDragonSegmentStyle = (index: number) => {
    const isHead = index === 0;
    const isTail = index === gameState.dragon.length - 1;
    const intensity = Math.max(0.4, 1 - index * 0.08);
    const isFireActive =
      gameState.powerUp.active && gameState.powerUp.type === "fire";
    if (isHead) {
      return {
        background: "transparent",
        backdropFilter: "blur(8px)",
        borderRadius: "50%",
        boxShadow: isFireActive
          ? "0 0 25px rgba(239, 68, 68, 0.3)"
          : "0 0 25px rgba(34, 197, 94, 0.3)",
        transform: "scale(1.2)",
        zIndex: 20,
      };
    } else if (isTail) {
      return {
        background: "transparent",
        backdropFilter: "blur(4px)",
        borderRadius: "60%",
        transform: "scale(0.7)",
        zIndex: 10 - index,
      };
    } else {
      return {
        background: "transparent",
        backdropFilter: "blur(4px)",
        borderRadius: "40%",
        transform: `scale(${0.85 + Math.sin(index * 0.5) * 0.1})`,
        zIndex: 15 - index,
      };
    }
  };

  // Get power-up icon and color
  const getPowerUpDisplay = (type: "fire" | "speed" | "star") => {
    switch (type) {
      case "fire":
        return {
          icon: <FireIcon className="w-4 h-4" />,
          color: "text-red-400",
        };
      case "speed":
        return {
          icon: <BoltIcon className="w-4 h-4" />,
          color: "text-yellow-400",
        };
      case "star":
        return {
          icon: <StarIcon className="w-4 h-4" />,
          color: "text-emerald-400",
        };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="bg-surface-50/30 backdrop-blur-md border-2 border-surface-200 rounded-t-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-emerald-500/30">
              <span className="text-xl">🐲</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                Dragon Quest
              </h3>
              <p className="text-xs text-text-secondary">
                Guide your dragon to collect gems
              </p>
            </div>
          </div>
          {/* Game Stats */}
          <div className="flex items-center space-x-4">
            <div className="bg-white/50 backdrop-blur-sm border-2 border-surface-200/80 rounded-lg px-3 py-1.5">
              <div className="text-xs text-text-secondary">Score</div>
              <div className="text-sm font-bold text-yellow-400">
                {gameState.score}
              </div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm border-2 border-surface-200/80 rounded-lg px-3 py-1.5">
              <div className="text-xs text-text-secondary">Level</div>
              <div className="text-sm font-bold text-green-400">
                {gameState.level}
              </div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm border-2 border-surface-200/80 rounded-lg px-3 py-1.5">
              <div className="text-xs text-text-secondary">Length</div>
              <div className="text-sm font-bold text-teal-400">
                {gameState.dragon.length}
              </div>
            </div>
            {gameState.powerUp.active && (
              <div className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-3 py-1.5 flex items-center space-x-2">
                <div
                  className={getPowerUpDisplay(gameState.powerUp.type!).color}
                >
                  {getPowerUpDisplay(gameState.powerUp.type!).icon}
                </div>
                <div className="text-xs text-text-primary font-medium">
                  {Math.ceil(gameState.powerUp.duration / 20)}s
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Game Board */}
      <div className="relative bg-surface-50/20 backdrop-blur-xl border-x-2 border-surface-200">
        <div className="p-6">
          <div
            className="relative bg-surface-50/20 backdrop-blur-md border-2 border-surface-200/60 rounded-xl p-4 shadow-2xl"
            style={{
              width: `${BOARD_SIZE * 24 + 16}px`,
              height: `${BOARD_SIZE * 24 + 16}px`,
              margin: "0 auto",
            }}
          >
            {/* Grid Background */}
            <div
              className="absolute inset-2 grid opacity-30"
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 24px)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 24px)`,
                gap: "0px",
              }}
            >
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map(
                (_, index) => {
                  const isEvenRow = Math.floor(index / BOARD_SIZE) % 2 === 0;
                  const isEvenCol = index % 2 === 0;
                  const isDark = isEvenRow ? isEvenCol : !isEvenCol;
                  return (
                    <div
                      key={index}
                      className={`w-6 h-6 ${isDark ? "bg-dark-border/10" : "bg-dark-border/5"} transition-colors duration-1000`}
                    />
                  );
                }
              )}
            </div>
            {/* Dragon */}
            {gameState.dragon.map((segment, index) => {
              const isHead = index === 0;
              const isTail = index === gameState.dragon.length - 1;
              const segmentStyle = getDragonSegmentStyle(index);
              const isFireActive =
                gameState.powerUp.active && gameState.powerUp.type === "fire";
              return (
                <div
                  key={index}
                  className="absolute transition-all duration-150 ease-out flex items-center justify-center"
                  style={{
                    left: segment.x * 24 + 8,
                    top: segment.y * 24 + 8,
                    width: "20px",
                    height: "20px",
                    ...segmentStyle,
                  }}
                >
                  {isHead && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Dragon Head */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          isFireActive
                            ? "bg-red-400 border-red-500"
                            : "bg-green-400 border-green-500"
                        } shadow-lg`}
                      >
                        {/* Dragon Eyes */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex space-x-0.5 mt-0.5">
                            <div className="w-0.5 h-0.5 bg-yellow-300 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-yellow-300 rounded-full"></div>
                          </div>
                        </div>
                        {/* Dragon Nostrils/Mouth based on direction */}
                        {gameState.direction.x === 1 && (
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1">
                            <div
                              className={`w-1 h-0.5 rounded-r ${isFireActive ? "bg-red-600" : "bg-green-600"}`}
                            ></div>
                          </div>
                        )}
                        {gameState.direction.x === -1 && (
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
                            <div
                              className={`w-1 h-0.5 rounded-l ${isFireActive ? "bg-red-600" : "bg-green-600"}`}
                            ></div>
                          </div>
                        )}
                        {gameState.direction.y === -1 && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                            <div
                              className={`w-0.5 h-1 rounded-t ${isFireActive ? "bg-red-600" : "bg-green-600"}`}
                            ></div>
                          </div>
                        )}
                        {gameState.direction.y === 1 && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
                            <div
                              className={`w-0.5 h-1 rounded-b ${isFireActive ? "bg-red-600" : "bg-green-600"}`}
                            ></div>
                          </div>
                        )}
                      </div>
                      {/* Dragon Horns */}
                      <div className="absolute -top-1 left-1">
                        <div className="w-0.5 h-1 bg-yellow-600 rounded-t transform -rotate-12"></div>
                      </div>
                      <div className="absolute -top-1 right-1">
                        <div className="w-0.5 h-1 bg-yellow-600 rounded-t transform rotate-12"></div>
                      </div>
                      {/* Fire Breath Effect */}
                      {isFireActive && (
                        <div className="absolute animate-pulse">
                          {gameState.direction.x === 1 && (
                            <div className="absolute left-5 top-1 w-3 h-1 bg-gradient-to-r from-red-500 to-yellow-400 rounded opacity-80"></div>
                          )}
                          {gameState.direction.x === -1 && (
                            <div className="absolute right-5 top-1 w-3 h-1 bg-gradient-to-l from-red-500 to-yellow-400 rounded opacity-80"></div>
                          )}
                          {gameState.direction.y === -1 && (
                            <div className="absolute top-5 left-1 w-1 h-3 bg-gradient-to-t from-red-500 to-yellow-400 rounded opacity-80"></div>
                          )}
                          {gameState.direction.y === 1 && (
                            <div className="absolute -top-5 left-1 w-1 h-3 bg-gradient-to-b from-red-500 to-yellow-400 rounded opacity-80"></div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!isHead && !isTail && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Dragon Body Segment */}
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          isFireActive
                            ? "bg-red-500 border-red-600"
                            : "bg-green-500 border-green-600"
                        } opacity-90 shadow-md`}
                      >
                        {/* Scale Pattern */}
                        <div className="absolute inset-0.5 border border-green-800/60 rounded-full"></div>
                        <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-yellow-400/70 rounded-full"></div>
                      </div>
                    </div>
                  )}
                  {isTail && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Dragon Tail */}
                      <div
                        className={`w-2 h-2 transform rotate-45 ${
                          isFireActive
                            ? "bg-red-400 border-red-500"
                            : "bg-green-400 border-green-500"
                        } border-2 opacity-80 rounded-sm shadow-sm`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-0.5 h-0.5 bg-yellow-500/70 rounded-full transform -rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Gem */}
            <div
              className="absolute w-5 h-5 flex items-center justify-center transition-all duration-300"
              style={{
                left: gameState.gem.x * 24 + 8,
                top: gameState.gem.y * 24 + 8,
              }}
            >
              <div className="w-4 h-4 bg-gradient-to-br from-emerald-400/80 to-green-500/80 backdrop-blur-sm border-2 border-emerald-400/70 rounded-full animate-pulse shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-200 rounded-full animate-ping"></div>
              </div>
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
            </div>
            {/* Power-up */}
            {gameState.powerUp.position && (
              <div
                className="absolute w-5 h-5 flex items-center justify-center transition-all duration-300"
                style={{
                  left: gameState.powerUp.position.x * 24 + 8,
                  top: gameState.powerUp.position.y * 24 + 8,
                }}
              >
                <div className="w-4 h-4 bg-gradient-to-br from-emerald-400/80 to-pink-500/80 backdrop-blur-sm border-2 border-emerald-400/70 rounded-lg animate-bounce shadow-lg flex items-center justify-center">
                  <div
                    className={`text-xs ${getPowerUpDisplay(gameState.powerUp.type!).color}`}
                  >
                    {getPowerUpDisplay(gameState.powerUp.type!).icon}
                  </div>
                </div>
                <div className="absolute inset-0 bg-purple-400/20 rounded-lg animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 rounded-full transition-opacity duration-300"
              style={{
                left: particle.x + 24,
                top: particle.y + 24,
                backgroundColor: particle.color,
                opacity: particle.life,
                transform: `scale(${particle.life})`,
                filter: "blur(0.5px)",
              }}
            />
          ))}
        </div>
      </div>
      {/* Game Controls */}
      <div className="bg-surface-50/30 backdrop-blur-md border-2 border-surface-200 rounded-b-xl p-4">
        {!gameState.gameStarted ? (
          <div className="text-center">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 backdrop-blur-sm border-2 border-emerald-400/60 text-white font-semibold rounded-lg hover:from-emerald-600/80 hover:to-teal-600/80 transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              <span className="flex items-center space-x-2">
                <span>🐲</span>
                <span>Start Dragon Quest</span>
              </span>
            </button>
            <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-text-secondary">
              <div className="flex items-center space-x-1">
                <kbd className="px-2 py-1 bg-white/50 border border-surface-200/50 rounded text-xs">
                  WASD
                </kbd>
                <span>or</span>
                <kbd className="px-2 py-1 bg-white/50 border border-surface-200/50 rounded text-xs">
                  ←↑↓→
                </kbd>
                <span>to move</span>
              </div>
            </div>
          </div>
        ) : gameState.gameOver ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="text-red-400 text-lg font-semibold mb-2 flex items-center justify-center space-x-2">
                <span>💀</span>
                <span>Game Over!</span>
              </div>
              <div className="bg-white/50 backdrop-blur-sm border border-surface-200/50 rounded-lg p-3 inline-block">
                <div className="text-text-secondary text-sm mb-1">
                  Final Score
                </div>
                <div className="text-yellow-400 text-xl font-bold">
                  {gameState.score}
                </div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500/80 to-pink-500/80 backdrop-blur-sm border border-emerald-400/30 text-white font-semibold rounded-lg hover:from-emerald-600/80 hover:to-pink-600/80 transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              <span className="flex items-center space-x-2">
                <span>🔄</span>
                <span>Play Again</span>
              </span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg p-2">
              <div className="text-red-400 text-lg mb-1">🔥</div>
              <div className="text-xs text-text-secondary">Fire Power</div>
              <div className="text-xs text-dark-text-muted">Red dragon</div>
            </div>
            <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-lg p-2">
              <div className="text-yellow-400 text-lg mb-1">⚡</div>
              <div className="text-xs text-text-secondary">
                Speed Boost
              </div>
              <div className="text-xs text-dark-text-muted">2x faster</div>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-lg p-2">
              <div className="text-emerald-400 text-lg mb-1">⭐</div>
              <div className="text-xs text-text-secondary">Star Power</div>
              <div className="text-xs text-dark-text-muted">Bonus points</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragonSnakeGame;
