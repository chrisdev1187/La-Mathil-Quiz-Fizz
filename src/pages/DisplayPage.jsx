import React from "react";
import { useNavigate } from "react-router-dom";

function DisplayPage() {
  const navigate = useNavigate();
  const [gameState, setGameState] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selectedSession, setSelectedSession] = React.useState("");
  const [sessionInput, setSessionInput] = React.useState("");
  const [showSessionPrompt, setShowSessionPrompt] = React.useState(true);
  const [animationState, setAnimationState] = React.useState("idle");
  const [selectedBall, setSelectedBall] = React.useState(null);
  const [ballPositions, setBallPositions] = React.useState([]);
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const containerRef = React.useRef(null);

  // Initialize ball positions
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const initialBalls = [];
    const containerWidth = 1200;
    const containerHeight = 560;
    const ballRadius = 27;
    
    for (let i = 1; i <= 75; i++) {
      let x, y, attempts = 0;
      let validPosition = false;
      
      while (!validPosition && attempts < 100) {
        x = Math.random() * (containerWidth - ballRadius * 2) + ballRadius;
        y = Math.random() * (containerHeight - ballRadius * 2) + ballRadius;
        
        validPosition = true;
        for (const ball of initialBalls) {
          const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
          if (distance < ballRadius * 2.2) {
            validPosition = false;
            break;
          }
        }
        attempts++;
      }
      
      if (!validPosition) {
        x = Math.random() * (containerWidth - ballRadius * 2) + ballRadius;
        y = Math.random() * (containerHeight - ballRadius * 2) + ballRadius;
      }
      
      initialBalls.push({
        id: i,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: ballRadius,
        number: i,
        bounceCount: 0,
        fading: false,
        fade: 0
      });
    }
    setBallPositions(initialBalls);
  }, []);

  // Timer logic for trivia questions
  React.useEffect(() => {
    if (gameState?.session?.currentQuestionStatus === 'active' && gameState?.session?.timeRemaining > 0) {
      // Start countdown timer
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            // Trigger immediate state update when timer expires
            setTimeout(() => {
              loadGameState();
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else if (gameState?.session?.currentQuestionStatus === 'paused') {
      // Keep current time when paused
      // Timer will resume when status changes back to 'active'
    } else {
      // Reset timer when question is not active
      setTimeRemaining(0);
    }
  }, [gameState?.session?.currentQuestionStatus, gameState?.session?.timeRemaining]);

  // Update timeRemaining when game state changes
  React.useEffect(() => {
    if (gameState?.session?.timeRemaining !== undefined) {
      setTimeRemaining(gameState.session.timeRemaining);
    }
  }, [gameState?.session?.timeRemaining, gameState?.session?.currentQuestionStatus]);

  // Load game state
  React.useEffect(() => {
    if (!selectedSession) {
      setLoading(false);
      return;
    }
    
    loadGameState();
    const interval = setInterval(loadGameState, 2000);
    return () => clearInterval(interval);
  }, [selectedSession]);

  // Animation loop
  React.useEffect(() => {
    if (animationState === "idle") return;

    const containerWidth = 1200;
    const containerHeight = 560;
    const gravity = 0.35;

    const animate = () => {
      setBallPositions(prevBalls => {
        const updated = [];
        for (let idx = 0; idx < prevBalls.length; idx++) {
          const ball = prevBalls[idx];
          let newX = ball.x + ball.vx;
          let newY = ball.y + ball.vy;
          let newVx = ball.vx;
          let newVy = ball.vy;
          let newBounceCount = ball.bounceCount;

          newVy += gravity;

          if (newX <= ball.radius) {
            newVx = Math.abs(newVx) * 0.85;
            newX = ball.radius;
            newBounceCount++;
          }
          if (newX >= containerWidth - ball.radius) {
            newVx = -Math.abs(newVx) * 0.85;
            newX = containerWidth - ball.radius;
            newBounceCount++;
          }
          if (newY <= ball.radius) {
            newVy = Math.abs(newVy) * 0.85;
            newY = ball.radius;
            newBounceCount++;
          }
          if (newY >= containerHeight - ball.radius) {
            newVy = -Math.abs(newVy) * 0.7;
            newY = containerHeight - ball.radius;
            newBounceCount++;
            newVx *= 0.985;
          }

          if (animationState === "whirlwind") {
            newVx += 0.25 + (Math.random() - 0.5) * 0.4;
            newVy += (Math.random() - 0.5) * 0.8;
            const centerX = containerWidth * 0.5;
            const centerY = containerHeight * 0.4;
            const dxc = centerX - newX;
            const dyc = centerY - newY;
            const dist = Math.sqrt(dxc * dxc + dyc * dyc) || 1;
            newVx += (dyc / dist) * 0.35;
            newVy += (-dxc / dist) * 0.35;
            const maxVel = 9;
            const vel = Math.sqrt(newVx * newVx + newVy * newVy);
            if (vel > maxVel) {
              newVx = (newVx / vel) * maxVel;
              newVy = (newVy / vel) * maxVel;
            }
          }

          for (let j = 0; j < prevBalls.length; j++) {
            if (j === idx) continue;
            const other = prevBalls[j];
            const dx = newX - other.x;
            const dy = newY - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
            const minDist = ball.radius + other.radius;
            if (dist < minDist) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              newX += nx * (overlap * 0.6);
              newY += ny * (overlap * 0.6);
              const vn = newVx * nx + newVy * ny;
              newVx -= 1.5 * vn * nx;
              newVy -= 1.5 * vn * ny;
            }
          }

          newVx *= animationState === "whirlwind" ? 0.99 : 0.985;
          newVy *= animationState === "whirlwind" ? 0.99 : 0.985;

          let fading = ball.fading;
          let fade = ball.fade;
          if (fading) {
            fade = Math.min(1, fade + 0.04);
          }

          const updatedBall = {
            ...ball,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            bounceCount: newBounceCount,
            fading,
            fade
          };

          if (fading && fade >= 1) {
            continue;
          }
          updated.push(updatedBall);
        }
        return updated;
      });
    };

    const animationId = setInterval(animate, 16);
    return () => clearInterval(animationId);
  }, [animationState]);

  React.useEffect(() => {
    if (animationState !== "whirlwind") return;
    const t = setTimeout(() => setAnimationState("physics"), 1200);
    return () => clearTimeout(t);
  }, [animationState]);

  const loadGameState = async () => {
    try {
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedSession }),
      });

      const result = await response.json();
      if (result.success) {
        const statusChangedToActive = gameState?.session?.status !== "active" && result.session.status === "active";
        const wasDrawing = gameState?.session?.currentBall !== result.session.currentBall;
        setGameState(result);
        setError("");
        
        if (statusChangedToActive) {
          setAnimationState("whirlwind");
        }
        if (wasDrawing && result.session.currentBall) {
          const drawn = result.session.currentBall;
          setBallPositions(prev => prev.map(b => b.number === drawn ? { ...b, fading: true, fade: 0 } : b));
          setAnimationState("whirlwind");
        }
      } else {
        setError(result.error || "Failed to load game state");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const getBallLetter = (number) => {
    if (number >= 1 && number <= 15) return "B";
    if (number >= 16 && number <= 30) return "I";
    if (number >= 31 && number <= 45) return "N";
    if (number >= 46 && number <= 60) return "G";
    return "O";
  };

  const getBallColor = (number) => {
    if (number >= 1 && number <= 15) return "#FF6B6B";
    if (number >= 16 && number <= 30) return "#4ECDC4";
    if (number >= 31 && number <= 45) return "#45B7D1";
    if (number >= 46 && number <= 60) return "#96CEB4";
    return "#FFEAA7";
  };

  const joinSession = () => {
    if (!sessionInput.trim()) {
      setError("Please enter a session code");
      return;
    }
    
    setSelectedSession(sessionInput.trim().toUpperCase());
    setShowSessionPrompt(false);
    setLoading(true);
    setError("");
  };

  const changeSession = () => {
    setSelectedSession("");
    setSessionInput("");
    setShowSessionPrompt(true);
    setGameState(null);
    setError("");
  };

  if (showSessionPrompt) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-20">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full blur-xl animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${15 + Math.random() * 25}px`,
                  height: `${15 + Math.random() * 25}px`,
                  backgroundColor: ["#00BFFF", "#FF007F", "#FFD700"][
                    Math.floor(Math.random() * 3)
                  ],
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00BFFF] via-[#FF007F] to-[#FFD700] animate-neon-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFD700] via-[#FF007F] to-[#00BFFF] animate-neon-pulse"></div>
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#00BFFF] via-[#FF007F] to-[#FFD700] animate-neon-pulse"></div>
          <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-[#FFD700] via-[#FF007F] to-[#00BFFF] animate-neon-pulse"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div
            className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-8 max-w-md w-full text-center"
            style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.3)" }}
          >
            <h1
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F] mb-6"
              style={{
                fontFamily: "Impact, Arial Black, sans-serif",
                textShadow: "0 0 10px #FFD700",
              }}
            >
              🎪 PUBLIC DISPLAY
            </h1>

            <div className="text-white/80 mb-6">
              Enter the session code to view the game display
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label
                  className="block text-[#00BFFF] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #00BFFF" }}
                >
                  Session Code:
                </label>
                <input
                  type="text"
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                  placeholder="Enter session code (e.g., VB-2025)"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 191, 255, 0.3)",
                    fontFamily: "Courier New, monospace",
                  }}
                  maxLength={15}
                  autoFocus
                />
              </div>

              <button
                onClick={joinSession}
                className="w-full py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 border-2 border-[#00FF00]"
                style={{
                  boxShadow: "0 0 15px #00FF00",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                🖥️ VIEW DISPLAY
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-[#FFD700] text-2xl font-bold animate-pulse">
          🎰 Loading Vegas Display...
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">
            {error || "Game not found"}
          </div>
          <div className="text-white/60 mb-4">
            Session "{selectedSession}" not found or not active
          </div>
          <button
            onClick={changeSession}
            className="px-6 py-2 bg-gradient-to-r from-[#00BFFF] to-[#0080FF] text-white font-bold rounded-lg hover:from-[#0080FF] hover:to-[#00BFFF] transition-all duration-300"
          >
            Try Different Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A0F2A] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-xl animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 30}px`,
                height: `${20 + Math.random() * 30}px`,
                backgroundColor: ["#00BFFF", "#FF007F", "#FFD700", "#32CD32"][
                  Math.floor(Math.random() * 4)
                ],
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#00BFFF] via-[#FF007F] to-[#FFD700] animate-neon-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-[#FFD700] via-[#FF007F] to-[#00BFFF] animate-neon-pulse"></div>
        <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-[#00BFFF] via-[#FF007F] to-[#FFD700] animate-neon-pulse"></div>
        <div className="absolute top-0 right-0 w-3 h-full bg-gradient-to-b from-[#FFD700] via-[#FF007F] to-[#00BFFF] animate-neon-pulse"></div>
      </div>

      <div className="relative z-10 p-8">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img
              src="/LogoT.png"
              alt="Vegas Luck Bingo"
              className="mx-auto max-h-24 md:max-h-28"
              style={{ filter: "drop-shadow(0 0 16px rgba(255,215,0,0.35))" }}
            />
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-[#00BFFF] text-2xl font-bold">
              Game: {gameState.session.gameId} | Round {gameState.session.roundNumber}
            </div>
            <button
              onClick={changeSession}
              className="px-4 py-2 bg-gradient-to-r from-[#FF007F] to-[#DC143C] text-white font-bold rounded-lg hover:from-[#DC143C] hover:to-[#FF007F] transition-all duration-300 text-sm"
            >
              Change Session
            </button>
          </div>
          <div className={`text-2xl font-bold mt-2 ${
            gameState.session.status === "active" ? "text-[#00FF00]" : 
            gameState.session.status === "paused" ? "text-[#FFD700]" : 
            "text-[#FF007F]"
          }`}>
            Status: {gameState.session.status.toUpperCase()}
          </div>
        </div>

        {gameState.session.mode === "bingo" ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <div
                className="bg-black/80 backdrop-blur-sm border-4 border-[#FFD700] rounded-3xl p-4 mb-8"
                style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)" }}
              >
                <div className="text-center">
                  <div
                    ref={containerRef}
                    className="relative bg-black/60 rounded-2xl border-2 border-[#00BFFF]/50 mx-auto"
                    style={{ width: "100%", height: "560px", maxWidth: "100%" }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      {ballPositions.map((ball) => (
                        <div
                          key={ball.id}
                          className={`absolute rounded-full transition-all duration-100 ${
                            selectedBall === ball.number ? "z-20 scale-110" : "z-10"
                          }`}
                          style={{
                            left: `${ball.x}px`,
                            top: `${ball.y}px`,
                            width: `${ball.radius * 2}px`,
                            height: `${ball.radius * 2}px`,
                            backgroundColor: getBallColor(ball.number),
                            transform: `translate(-50%, -50%) ${
                              selectedBall === ball.number ? "scale(1.1)" : ""
                            }`,
                            opacity: 1 - (ball.fade || 0),
                            boxShadow: selectedBall === ball.number 
                              ? "0 0 24px #FFD700" 
                              : "0 0 10px rgba(0,0,0,0.6)",
                            border: selectedBall === ball.number 
                              ? "4px solid #FFD700" 
                              : "2px solid rgba(255,255,255,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            fontWeight: "bold",
                            color: "white",
                            textShadow: "0 0 3px rgba(0,0,0,0.8)"
                          }}
                        >
                          {ball.number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {gameState.session.drawnBalls.length > 0 && (
                <div
                  className="w-full bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-6"
                  style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
                >
                  <div className="text-white/80 text-sm mb-3">
                    DRAWN BALLS ({gameState.session.drawnBalls.length}/75)
                  </div>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {gameState.session.drawnBalls.map((ball) => (
                      <div
                        key={ball}
                        className="px-3 py-1 rounded text-sm font-bold border"
                        style={{
                          backgroundColor: getBallColor(ball),
                          color: ball <= 60 ? "#FFFFFF" : "#000000",
                          borderColor: "rgba(255,255,255,0.35)",
                          boxShadow: "0 0 8px rgba(255,215,0,0.2)",
                        }}
                        title={`${getBallLetter(ball)}-${ball}`}
                      >
                        {getBallLetter(ball)}-{ball}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div
                className="bg-black/80 backdrop-blur-sm border-2 border-[#32CD32] rounded-2xl p-6"
                style={{ boxShadow: "0 0 20px rgba(50, 205, 50, 0.3)" }}
              >
                <div className="text-center">
                  <div className="text-[#32CD32] text-xl font-bold mb-2">
                    🎮 ACTIVE PLAYERS
                  </div>
                  <div className="text-6xl font-bold text-[#FFD700] mb-4">
                    {gameState.session.playerCount}
                  </div>
                  <div className="text-white/80">
                    Players connected to the game
                  </div>
                </div>
              </div>

              <div
                className="bg-black/80 backdrop-blur-sm border-2 border-[#FF007F] rounded-2xl p-6"
                style={{ boxShadow: "0 0 20px rgba(255, 0, 127, 0.3)" }}
              >
                <div className="text-center">
                  <div className="text-[#FF007F] text-xl font-bold mb-2">
                    🎯 GAME MODE
                  </div>
                  <div className="text-3xl font-bold text-[#FFD700] mb-2">
                    {gameState.session.mode.toUpperCase()}
                  </div>
                  <div className="text-white/80">
                    Current game mode
                  </div>
                </div>
              </div>

              <div
                className="bg-black/80 backdrop-blur-sm border-2 border-[#9400D3] rounded-2xl p-6"
                style={{ boxShadow: "0 0 20px rgba(148, 0, 211, 0.3)" }}
              >
                <div className="text-[#9400D3] text-xl font-bold mb-4">
                  📊 SESSION INFO
                </div>
                <div className="space-y-2 text-white/80">
                  <div>Game ID: <span className="text-[#FFD700] font-bold">{gameState.session.gameId}</span></div>
                  <div>Round: <span className="text-[#FFD700] font-bold">{gameState.session.roundNumber}</span></div>
                  <div>Status: <span className={`font-bold ${
                    gameState.session.status === "active" ? "text-[#00FF00]" : 
                    gameState.session.status === "paused" ? "text-[#FFD700]" : 
                    "text-[#FF007F]"
                  }`}>{gameState.session.status.toUpperCase()}</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <div
                  className="bg-black/80 backdrop-blur-sm border-4 border-[#00BFFF] rounded-3xl p-8 mb-8"
                  style={{ boxShadow: "0 0 30px rgba(0, 191, 255, 0.4)" }}
                >
                  <div className="text-center">
                    <h2
                      className="text-4xl font-bold text-[#00BFFF] mb-8"
                      style={{ textShadow: "0 0 20px #00BFFF", fontFamily: "Impact, Arial Black, sans-serif" }}
                    >
                      🧠 TRIVIA CHALLENGE
                    </h2>

                    {gameState.currentQuestion ? (
                      <div className="space-y-6">
                        <div className="bg-black/40 rounded-2xl p-8">
                          <h3 className="text-[#FFD700] font-bold text-2xl mb-6">QUESTION:</h3>
                          <p className="text-white text-3xl leading-relaxed font-bold">
                            {gameState.currentQuestion.question}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          {gameState.currentQuestion.answers.map((answer, index) => (
                            <div
                              key={index}
                              className={`p-6 rounded-2xl border-4 ${
                                gameState.session.currentQuestionStatus === 'results' && index === gameState.currentQuestion.correctAnswer
                                  ? "bg-green-500/20 border-green-500 text-green-300"
                                  : gameState.session.currentQuestionStatus === 'results' && index !== gameState.currentQuestion.correctAnswer
                                  ? "bg-red-500/20 border-red-500 text-red-300"
                                  : "bg-black/40 border-white/30 text-white"
                              }`}
                            >
                              <div className="text-2xl font-bold">
                                <span className="text-[#FFD700] mr-4 text-4xl">
                                  {String.fromCharCode(65 + index)}
                                </span>
                                {answer}
                                {gameState.session.currentQuestionStatus === 'results' && index === gameState.currentQuestion.correctAnswer && (
                                  <span className="ml-4 text-green-400 text-4xl">✓</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {gameState.session.currentQuestionStatus === 'results' && (
                          <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-6">
                            <div className="text-center">
                              <div className="text-green-300 font-bold text-3xl mb-2">✅ CORRECT ANSWER</div>
                              <div className="text-green-400 text-2xl">
                                {String.fromCharCode(65 + gameState.currentQuestion.correctAnswer)}: {gameState.currentQuestion.answers[gameState.currentQuestion.correctAnswer]}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-black/40 rounded-2xl p-6">
                          <div className="text-[#FF007F] font-bold text-2xl mb-4">⏰ TIME REMAINING</div>
                          <div className="w-full bg-gray-700 rounded-full h-6">
                            <div
                              className={`h-6 rounded-full transition-all duration-1000 ${
                                timeRemaining > 5 
                                  ? "bg-gradient-to-r from-[#00BFFF] to-[#FFD700]" 
                                  : timeRemaining > 0
                                  ? "bg-gradient-to-r from-[#FF4500] to-[#FF0000]"
                                  : "bg-red-600"
                              }`}
                              style={{ 
                                width: timeRemaining > 0 ? `${Math.max(0, Math.min(100, (timeRemaining / 30) * 100))}%` : "0%"
                              }}
                            ></div>
                          </div>
                          <div className={`text-4xl font-bold mt-4 ${
                            timeRemaining > 5 
                              ? "text-[#FFD700]" 
                              : timeRemaining > 0
                              ? "text-[#FF4500] animate-pulse"
                              : "text-[#FF0000] animate-pulse"
                          }`}>
                            {timeRemaining > 0 ? `${timeRemaining}s` : "TIME'S UP!"}
                          </div>
                          {gameState.session.currentQuestionStatus === 'active' && (
                            <div className="text-center mt-2">
                              <div className="text-[#00BFFF] text-sm font-bold">
                                Question {gameState.currentQuestion?.questionNumber || 1} of {gameState.currentQuestion?.totalQuestions || 20}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-white/60 py-20">
                        <div className="text-8xl mb-8">❓</div>
                        <p className="text-4xl font-bold">No Active Question</p>
                        <p className="text-2xl mt-4">Waiting for the host to start a trivia question...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Trivia Mode Leaderboard */}
              {gameState.session.mode === 'trivia' ? (
                <div
                  className="bg-black/80 backdrop-blur-sm border-4 border-[#FFD700] rounded-2xl p-6"
                  style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)" }}
                >
                  <h3
                    className="text-2xl font-bold text-[#FFD700] mb-6 text-center"
                    style={{ textShadow: "0 0 10px #FFD700" }}
                  >
                    🏆 TRIVIA LEADERBOARD
                  </h3>
                  <div className="space-y-3">
                    {gameState.players
                      .sort((a, b) => (b.triviaPoints || 0) - (a.triviaPoints || 0))
                      .slice(0, 8)
                      .map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            index < 3 ? "bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20" : "bg-black/40"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`text-2xl font-bold ${
                              index === 0 ? "text-[#FFD700]" : 
                              index === 1 ? "text-gray-300" :
                              index === 2 ? "text-[#CD7F32]" : "text-white"
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <div className="text-white font-bold text-lg">{player.nickname}</div>
                              {player.teamName && (
                                <div 
                                  className="text-sm px-2 py-1 rounded mt-1"
                                  style={{ backgroundColor: player.teamColor + "40", color: player.teamColor }}
                                >
                                  {player.teamName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[#00BFFF] font-bold text-xl">{player.triviaPoints || 0}</div>
                            <div className="text-[#FFD700] text-sm">pts</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                /* Bingo Mode Leaderboard */
                <div
                  className="bg-black/80 backdrop-blur-sm border-4 border-[#FFD700] rounded-2xl p-6"
                  style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)" }}
                >
                  <h3
                    className="text-2xl font-bold text-[#FFD700] mb-6 text-center"
                    style={{ textShadow: "0 0 10px #FFD700" }}
                  >
                    🏆 LEADERBOARD
                  </h3>
                  <div className="space-y-3">
                    {gameState.players
                      .sort((a, b) => b.wins - a.wins)
                      .slice(0, 8)
                      .map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            index < 3 ? "bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20" : "bg-black/40"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`text-2xl font-bold ${
                              index === 0 ? "text-[#FFD700]" : 
                              index === 1 ? "text-gray-300" :
                              index === 2 ? "text-[#CD7F32]" : "text-white"
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <div className="text-white font-bold text-lg">{player.nickname}</div>
                              {player.teamName && (
                                <div 
                                  className="text-sm px-2 py-1 rounded mt-1"
                                  style={{ backgroundColor: player.teamColor + "40", color: player.teamColor }}
                                >
                                  {player.teamName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-[#00BFFF] font-bold text-xl">{player.wins}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div
                className="bg-black/80 backdrop-blur-sm border-4 border-[#00BFFF] rounded-2xl p-6"
                style={{ boxShadow: "0 0 30px rgba(0, 191, 255, 0.4)" }}
              >
                <h3
                  className="text-xl font-bold text-[#00BFFF] mb-4 text-center"
                  style={{ textShadow: "0 0 10px #00BFFF" }}
                >
                  📊 GAME INFO
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="text-white/80">Round:</span>
                    <span className="text-[#FFD700] font-bold">
                      {gameState.session.roundNumber} / {gameState.session.maxRounds}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-white/80">Players:</span>
                    <span className="text-[#00BFFF] font-bold">{gameState.players.length}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-white/80">Status:</span>
                    <span className={`font-bold ${
                      gameState.session.status === "active" ? "text-[#00FF00]" : 
                      gameState.session.status === "paused" ? "text-[#FFD700]" : 
                      "text-[#FF007F]"
                    }`}>{gameState.session.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DisplayPage;