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
  const [animationState, setAnimationState] = React.useState("idle"); // idle, whirlwind, selection
  const [selectedBall, setSelectedBall] = React.useState(null);
  const [ballPositions, setBallPositions] = React.useState([]);
  const [physicsEngine, setPhysicsEngine] = React.useState(null);
  const containerRef = React.useRef(null);
  const ballsRef = React.useRef([]);

  // Initialize physics engine and balls
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Create physics engine (simplified version without Matter.js)
    const engine = {
      world: {
        bodies: [],
        gravity: { x: 0, y: 0.5 },
        bounds: { width: 800, height: 600 }
      },
      render: null,
      runner: null
    };

    setPhysicsEngine(engine);

    // Initialize ball positions - all 75 balls
    const initialBalls = [];
    const containerWidth = 800;
    const containerHeight = 400;
    const ballRadius = 12;
    
    for (let i = 1; i <= 75; i++) {
      let x, y, attempts = 0;
      let validPosition = false;
      
      // Try to place ball without overlapping
      while (!validPosition && attempts < 100) {
        x = Math.random() * (containerWidth - ballRadius * 2) + ballRadius;
        y = Math.random() * (containerHeight - ballRadius * 2) + ballRadius;
        
        // Check for overlap with existing balls
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
      
      // If we couldn't find a good position, place randomly anyway
      if (!validPosition) {
        x = Math.random() * (containerWidth - ballRadius * 2) + ballRadius;
        y = Math.random() * (containerHeight - ballRadius * 2) + ballRadius;
      }
      
      initialBalls.push({
        id: i,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        radius: ballRadius,
        number: i,
        isSelected: false,
        bounceCount: 0
      });
    }
    setBallPositions(initialBalls);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Load game state on mount and set up polling
  React.useEffect(() => {
    if (!selectedSession) {
      setLoading(false);
      return;
    }
    
    loadGameState();
    const interval = setInterval(loadGameState, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [selectedSession]);

  // Animation loop for ball physics
  React.useEffect(() => {
    if (animationState === "idle") return;

    const containerWidth = 800;
    const containerHeight = 400;

    const animate = () => {
      setBallPositions(prevBalls => {
        return prevBalls.map(ball => {
          let newX = ball.x + ball.vx;
          let newY = ball.y + ball.vy;
          let newVx = ball.vx;
          let newVy = ball.vy;
          let newBounceCount = ball.bounceCount;

          // Bounce off walls with proper containment
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
            newVy = -Math.abs(newVy) * 0.85;
            newY = containerHeight - ball.radius;
            newBounceCount++;
          }

          // Add movement for whirlwind effect
          if (animationState === "whirlwind") {
            newVx += (Math.random() - 0.5) * 1.2;
            newVy += (Math.random() - 0.5) * 1.2;
            
            // Add spiral motion
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            const dx = centerX - newX;
            const dy = centerY - newY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              newVx += (dx / distance) * 0.3;
              newVy += (dy / distance) * 0.3;
            }
            
            // Limit velocity
            const maxVel = 12;
            const vel = Math.sqrt(newVx * newVx + newVy * newVy);
            if (vel > maxVel) {
              newVx = (newVx / vel) * maxVel;
              newVy = (newVy / vel) * maxVel;
            }
          } else if (animationState === "selection") {
            // Slow down during selection
            newVx *= 0.95;
            newVy *= 0.95;
          }

          // Ball-to-ball collision detection
          prevBalls.forEach(otherBall => {
            if (otherBall.id !== ball.id) {
              const dx = newX - otherBall.x;
              const dy = newY - otherBall.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = ball.radius + otherBall.radius;
              
              if (distance < minDistance && distance > 0) {
                // Simple collision response
                const pushForce = (minDistance - distance) * 0.1;
                const pushX = (dx / distance) * pushForce;
                const pushY = (dy / distance) * pushForce;
                
                newX += pushX;
                newY += pushY;
                newVx += pushX * 0.3;
                newVy += pushY * 0.3;
              }
            }
          });

          // General damping
          newVx *= animationState === "whirlwind" ? 0.995 : 0.98;
          newVy *= animationState === "whirlwind" ? 0.995 : 0.98;

          return {
            ...ball,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            bounceCount: newBounceCount
          };
        });
      });
    };

    const animationId = setInterval(animate, 16); // ~60fps
    return () => clearInterval(animationId);
  }, [animationState]);

  // Ball selection effect
  React.useEffect(() => {
    if (!gameState?.session?.currentBall || animationState !== "whirlwind") return;

    const timer = setTimeout(() => {
      setAnimationState("selection");
      setSelectedBall(gameState.session.currentBall);
      
      // Stop animation after selection
      setTimeout(() => {
        setAnimationState("idle");
      }, 3000);
    }, 5000); // Whirlwind for 5 seconds

    return () => clearTimeout(timer);
  }, [gameState?.session?.currentBall, animationState]);

  const loadGameState = async () => {
    try {
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedSession }),
      });

      const result = await response.json();
      if (result.success) {
        const wasDrawing = gameState?.session?.currentBall !== result.session.currentBall;
        setGameState(result);
        setError("");
        
        // Trigger ball animation when a new ball is drawn
        if (wasDrawing && result.session.currentBall) {
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
    if (number <= 15) return "B";
    if (number <= 30) return "I";
    if (number <= 45) return "N";
    if (number <= 60) return "G";
    return "O";
  };

  const getBallColor = (number) => {
    if (number <= 15) return "#FF6B6B"; // Red for B
    if (number <= 30) return "#4ECDC4"; // Teal for I
    if (number <= 45) return "#45B7D1"; // Blue for N
    if (number <= 60) return "#96CEB4"; // Green for G
    return "#FFEAA7"; // Yellow for O
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
        {/* Animated Neon Background */}
        <div className="absolute inset-0">
          {/* Bokeh lights */}
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

          {/* Neon frame strips */}
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
      {/* Animated Neon Background */}
      <div className="absolute inset-0">
        {/* Bokeh lights */}
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

        {/* Neon frame strips */}
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#00BFFF] via-[#FF007F] to-[#FFD700] animate-neon-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-[#FFD700] via-[#FF007F] to-[#00BFFF] animate-neon-pulse"></div>
        <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-[#00BFFF] via-[#FF007F] to-[#FFD700] animate-neon-pulse"></div>
        <div className="absolute top-0 right-0 w-3 h-full bg-gradient-to-b from-[#FFD700] via-[#FF007F] to-[#00BFFF] animate-neon-pulse"></div>
      </div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F] mb-4"
            style={{
              fontFamily: "Impact, Arial Black, sans-serif",
              textShadow: "0 0 20px #FFD700",
            }}
          >
            🎪 VEGAS LUCK BINGO
          </h1>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Current Ball Display */}
          <div className="xl:col-span-2">
            <div
              className="bg-black/80 backdrop-blur-sm border-4 border-[#FFD700] rounded-3xl p-8 mb-8"
              style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)" }}
            >
              <div className="text-center">
                <div
                  className="text-[#FFD700] text-3xl font-bold mb-6"
                  style={{ textShadow: "0 0 10px #FFD700" }}
                >
                  CURRENT BALL
                </div>
                {gameState.session.currentBall ? (
                  <div className="mb-6">
                    <div
                      className={`inline-block bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black rounded-full w-48 h-48 flex items-center justify-center text-6xl font-bold shadow-2xl transition-all duration-500 ${
                        selectedBall === gameState.session.currentBall && animationState === "selection" ? "animate-bounce scale-110" : ""
                      }`}
                      style={{ boxShadow: "0 0 40px #FFD700" }}
                    >
                      {getBallLetter(gameState.session.currentBall)}-{gameState.session.currentBall}
                    </div>
                  </div>
                ) : (
                  <div className="text-white/60 text-3xl mb-6">
                    Waiting for next ball...
                  </div>
                )}

                {/* Ball Whirlwind Animation Area */}
              <div
                ref={containerRef}
                  className="relative bg-black/60 rounded-2xl border-2 border-[#00BFFF]/50 mx-auto"
                  style={{ width: "800px", height: "400px", maxWidth: "100%" }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-2xl">
                {ballPositions.map((ball) => (
                  <div
                    key={ball.id}
                        className={`absolute rounded-full transition-all duration-100 ${
                          selectedBall === ball.number ? "z-20 scale-125" : "z-10"
                    }`}
                    style={{
                          left: `${ball.x}px`,
                          top: `${ball.y}px`,
                      width: `${ball.radius * 2}px`,
                      height: `${ball.radius * 2}px`,
                      backgroundColor: getBallColor(ball.number),
                          transform: `translate(-50%, -50%) ${
                            selectedBall === ball.number ? "scale(1.5)" : ""
                          }`,
                          boxShadow: selectedBall === ball.number 
                            ? "0 0 20px #FFD700" 
                            : "0 0 5px rgba(0,0,0,0.5)",
                          border: selectedBall === ball.number 
                            ? "3px solid #FFD700" 
                            : "1px solid rgba(255,255,255,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: ball.radius < 20 ? "10px" : "12px",
                          fontWeight: "bold",
                          color: "white",
                          textShadow: "0 0 3px rgba(0,0,0,0.8)"
                        }}
                      >
                    {ball.number}
                  </div>
                ))}
                  </div>
                  
                  {animationState === "whirlwind" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-[#FFD700] text-2xl font-bold animate-pulse">
                        🌪️ MIXING BALLS...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Drawn Balls - match host UI and stretch full width */}
            {gameState.session.drawnBalls.length > 0 && (
              <div
                className="w-full bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-6"
                style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
              >
                <div className="text-white/80 text-sm mb-3">
                  DRAWN BALLS ({gameState.session.drawnBalls.length}/75)
                </div>
                <div className="flex flex-wrap gap-2 justify-start">
                  {gameState.session.drawnBalls.slice(-10).reverse().map((ball) => (
                    <div
                      key={ball}
                      className="bg-white/20 text-[#FFD700] px-2 py-1 rounded text-sm font-bold border border-[#FFD700]/30"
                    >
                      {getBallLetter(ball)}-{ball}
                    </div>
                  ))}
                  {gameState.session.drawnBalls.length > 10 && (
                    <div className="text-white/60 text-sm flex items-center">
                      +{gameState.session.drawnBalls.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

          {/* Player Count and Status */}
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

            {/* Session Info */}
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
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes neon-pulse {
          0%, 100% { 
            opacity: 0.8;
            box-shadow: 0 0 10px currentColor;
          }
          50% { 
            opacity: 1;
            box-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-neon-pulse {
          animation: neon-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default DisplayPage;