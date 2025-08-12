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
  const [animationState, setAnimationState] = React.useState("idle"); // idle, whirlwind, physics
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
    const containerWidth = 1200;
    const containerHeight = 560;
    const ballRadius = 27; // increased size (another +50% from previous render)
    
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
    const interval = setInterval(loadGameState, 2000); // Poll faster for smoother sync
    return () => clearInterval(interval);
  }, [selectedSession]);

  // Animation loop for ball physics (gravity + collisions)
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

          // Gravity
          newVy += gravity;

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
            newVy = -Math.abs(newVy) * 0.7; // floor damping
            newY = containerHeight - ball.radius;
            newBounceCount++;
            // floor friction
            newVx *= 0.985;
          }

          // Whirlwind impulse: brief controlled swirl
          if (animationState === "whirlwind") {
            newVx += 0.25 + (Math.random() - 0.5) * 0.4;
            newVy += (Math.random() - 0.5) * 0.8;
            const centerX = containerWidth * 0.5;
            const centerY = containerHeight * 0.4;
            const dxc = centerX - newX;
            const dyc = centerY - newY;
            const dist = Math.sqrt(dxc * dxc + dyc * dyc) || 1;
            newVx += (dyc / dist) * 0.35; // tangential swirl
            newVy += (-dxc / dist) * 0.35;
            const maxVel = 9;
            const vel = Math.sqrt(newVx * newVx + newVy * newVy);
            if (vel > maxVel) {
              newVx = (newVx / vel) * maxVel;
              newVy = (newVy / vel) * maxVel;
            }
          }

          // Ball-to-ball collision detection
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
              // Separate this ball away from the other
              newX += nx * (overlap * 0.6);
              newY += ny * (overlap * 0.6);
              // Reflect velocity along normal to keep them solid
              const vn = newVx * nx + newVy * ny;
              newVx -= 1.5 * vn * nx;
              newVy -= 1.5 * vn * ny;
            }
          }

          // General damping to soften motion
          newVx *= animationState === "whirlwind" ? 0.99 : 0.985;
          newVy *= animationState === "whirlwind" ? 0.99 : 0.985;

          // Handle fading (remove drawn balls)
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

          // If fully faded, drop it from simulation
          if (fading && fade >= 1) {
            continue;
          }
          updated.push(updatedBall);
        }
        return updated;
      });
    };

    const animationId = setInterval(animate, 16); // ~60fps
    return () => clearInterval(animationId);
  }, [animationState]);

  // Whirlwind is brief, then switch to physics
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
        
        // Start animation on game start and on draw
        if (statusChangedToActive) {
          setAnimationState("whirlwind");
        }
        if (wasDrawing && result.session.currentBall) {
          // Mark drawn ball to fade out
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
    if (number >= 1 && number <= 15) return "#FF6B6B"; // B
    if (number >= 16 && number <= 30) return "#4ECDC4"; // I
    if (number >= 31 && number <= 45) return "#45B7D1"; // N
    if (number >= 46 && number <= 60) return "#96CEB4"; // G
    return "#FFEAA7"; // O
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
          <div className="mb-4">
            <img
              src="/branding/LogoT.png"
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Ball Animation Display - stretched across section */}
          <div className="xl:col-span-2">
            <div
              className="bg-black/80 backdrop-blur-sm border-4 border-[#FFD700] rounded-3xl p-4 mb-8"
              style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)" }}
            >
              <div className="text-center">
                {/* Full-width Ball Animation Area */}
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
    </div>
  );
}

export default DisplayPage;