import React from "react";
import { useNavigate } from "react-router-dom";

function HostPage() {
  const navigate = useNavigate();
  const [gameState, setGameState] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [showQuizManager, setShowQuizManager] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState(null);
  const [newQuestion, setNewQuestion] = React.useState({
    question: "",
    answers: ["", "", "", ""],
    correctAnswer: 0,
    timeLimit: 15,
    mediaUrl: null,
  });
  const [showPlayerCard, setShowPlayerCard] = React.useState(null);
  const [selectedSession, setSelectedSession] = React.useState("VB-2025");
  const [showCreateSession, setShowCreateSession] = React.useState(false);
  const [newSessionId, setNewSessionId] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [maxRounds, setMaxRounds] = React.useState(10);

  // Check authentication on mount
  React.useEffect(() => {
    const savedAuth = localStorage.getItem("hostAuthenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Load game state on mount and set up polling
  React.useEffect(() => {
    if (!isAuthenticated) return;
    
    loadGameState();
    const interval = setInterval(loadGameState, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [selectedSession, isAuthenticated]);

  const loadGameState = async () => {
    try {
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedSession }),
      });

      const result = await response.json();
      if (result.success) {
        setGameState(result);
        setError("");
      } else {
        setError(result.error || "Failed to load game state");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    if (!newSessionId.trim()) {
      setError("Please enter a session ID");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_session",
          gameId: newSessionId.trim().toUpperCase(),
          maxRounds: maxRounds,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSelectedSession(newSessionId.trim().toUpperCase());
        setShowCreateSession(false);
        setNewSessionId("");
        setError(""); // Clear any errors
        // Force immediate reload of game state with new session
        setLoading(true);
        await loadGameState();
      } else {
        setError(result.error || "Failed to create session");
      }
    } catch (err) {
      setError("Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  const drawBall = async () => {
    if (isDrawing || !gameState || gameState.session.status !== "active")
      return;

    setIsDrawing(true);

    try {
      const response = await fetch("/api/draw-ball", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedSession }),
      });

      const result = await response.json();
      if (result.success) {
        // Update local state immediately for better UX
        setGameState((prev) => ({
          ...prev,
          session: {
            ...prev.session,
            currentBall: result.ball.number,
            drawnBalls: result.gameState.drawnBalls,
          },
        }));
      } else {
        setError(result.error || "Failed to draw ball");
      }
    } catch (err) {
      setError("Failed to draw ball");
    } finally {
      setTimeout(() => setIsDrawing(false), 2000); // Animation duration
    }
  };

  const toggleGameStatus = async () => {
    if (!gameState) return;

    const action =
      gameState.session.status === "active" ? "pause_game" : "start_game";

    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, gameId: selectedSession }),
      });

      const result = await response.json();
      if (result.success) {
        setGameState((prev) => ({
          ...prev,
          session: { ...prev.session, status: result.status },
        }));
      } else {
        setError(result.error || "Failed to toggle game status");
      }
    } catch (err) {
      setError("Failed to toggle game status");
    }
  };

  const switchGameMode = async (newMode) => {
    if (!gameState || gameState.session.mode === newMode) return;

    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch_mode",
          gameId: selectedSession,
          gameMode: newMode,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setGameState((prev) => ({
          ...prev,
          session: { ...prev.session, mode: result.mode },
        }));
      } else {
        setError(result.error || "Failed to switch game mode");
      }
    } catch (err) {
      setError("Failed to switch game mode");
    }
  };

  const kickPlayer = async (playerId) => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kick_player",
          gameId: selectedSession,
          playerId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Remove player from local state
        setGameState((prev) => ({
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        }));
      } else {
        setError(result.error || "Failed to kick player");
      }
    } catch (err) {
      setError("Failed to kick player");
    }
  };

  const endRound = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_round",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`🎪 ${result.message}`);
        loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to end round");
      }
    } catch (err) {
      setError("Failed to end round");
    }
  };

  const announceWinner = async (playerId) => {
    try {
      setError(""); // Clear any previous errors
      
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "announce_winner",
          gameId: selectedSession,
          playerId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`🏆 ${result.message} 🎉`);
        loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to announce winner");
      }
    } catch (err) {
      console.error("Announce winner error:", err);
      setError("Failed to announce winner - check server connection");
    }
  };

  const viewPlayerCard = async (playerId) => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "view_player_card",
          playerId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowPlayerCard(result.player);
      } else {
        setError(result.error || "Failed to view player card");
      }
    } catch (err) {
      setError("Failed to view player card");
    }
  };

  const saveQuestion = async () => {
    if (
      !newQuestion.question.trim() ||
      newQuestion.answers.some((a) => !a.trim())
    ) {
      setError("Please fill in all question fields");
      return;
    }

    try {
      const action = editingQuestion ? "update_question" : "add_question";
      const questionData = editingQuestion
        ? { ...newQuestion, id: editingQuestion.id }
        : newQuestion;

      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          gameId: selectedSession,
          questionData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setNewQuestion({
          question: "",
          answers: ["", "", "", ""],
          correctAnswer: 0,
          timeLimit: 15,
          mediaUrl: null,
        });
        setEditingQuestion(null);
        setShowQuizManager(false);
        loadGameState(); // Refresh to get updated questions
      } else {
        setError(result.error || "Failed to save question");
      }
    } catch (err) {
      setError("Failed to save question");
    }
  };

  const authenticateHost = () => {
    if (passwordInput.trim() === "Bianca1236") {
      setIsAuthenticated(true);
      localStorage.setItem("hostAuthenticated", "true");
      setPasswordError("");
      setPasswordInput("");
    } else {
      setPasswordError("Invalid access code. Please try again.");
      setPasswordInput("");
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("hostAuthenticated");
    setPasswordInput("");
    setPasswordError("");
  };

  const getBallLetter = (number) => {
    if (number <= 15) return "B";
    if (number <= 30) return "I";
    if (number <= 45) return "N";
    if (number <= 60) return "G";
    return "O";
  };

  if (!isAuthenticated) {
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
              🔐 HOST ACCESS
            </h1>

            <div className="text-white/80 mb-6">
              Enter the access code to manage the game
            </div>

            {passwordError && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 text-red-300">
                {passwordError}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label
                  className="block text-[#00BFFF] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #00BFFF" }}
                >
                  Access Code:
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && authenticateHost()}
                  placeholder="Enter host access code"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 191, 255, 0.3)",
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={authenticateHost}
                  className="flex-1 py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 border-2 border-[#00FF00]"
                  style={{
                    boxShadow: "0 0 15px #00FF00",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  🚀 ACCESS HOST
                </button>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(180deg); }
          }
          
          @keyframes neon-pulse {
            0%, 100% { 
              opacity: 0.8;
              box-shadow: 0 0 10px currentColor;
            }
            50% { 
              opacity: 1;
              box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
            }
          }
          
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          
          .animate-neon-pulse {
            animation: neon-pulse 2s ease-in-out infinite;
          }
          
          button:hover {
            filter: brightness(1.1);
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-[#FFD700] text-2xl font-bold animate-pulse">
          🎰 Loading Vegas Luck Bingo...
        </div>
      </div>
    );
  }

  // Show create session option if game not found
  if (!gameState && error.includes("not found")) {
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
              🎪 CREATE NEW SESSION
            </h1>

            <div className="text-white/80 mb-6">
              Session "{selectedSession}" not found. Create a new game session
              to get started!
            </div>

            {error && !error.includes("not found") && (
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
                  Session ID:
                </label>
                <input
                  type="text"
                  value={newSessionId}
                  onChange={(e) =>
                    setNewSessionId(e.target.value.toUpperCase())
                  }
                  placeholder="Enter session ID (e.g., VB-2025)"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 191, 255, 0.3)",
                    fontFamily: "Courier New, monospace",
                  }}
                  maxLength={10}
                  disabled={isCreating}
                />
              </div>

              <div>
                <label
                  className="block text-[#00BFFF] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #00BFFF" }}
                >
                  Max Rounds (1-40):
                </label>
                <input
                  type="number"
                  value={maxRounds}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 40) {
                      setMaxRounds(value);
                    }
                  }}
                  min="1"
                  max="40"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300"
                  disabled={isCreating}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={createNewSession}
                  disabled={isCreating}
                  className="flex-1 py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#00FF00]"
                  style={{
                    boxShadow: "0 0 15px #00FF00",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {isCreating ? "🎰 CREATING..." : "🚀 CREATE SESSION"}
                </button>
                <button
                  onClick={() => (window.location.href = "/")}
                  disabled={isCreating}
                  className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(180deg); }
          }
          
          @keyframes neon-pulse {
            0%, 100% { 
              opacity: 0.8;
              box-shadow: 0 0 10px currentColor;
            }
            50% { 
              opacity: 1;
              box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
            }
          }
          
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          
          .animate-neon-pulse {
            animation: neon-pulse 2s ease-in-out infinite;
          }
          
          button:hover {
            filter: brightness(1.1);
          }
        `}</style>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-red-400 text-xl">
          {error || "Failed to load game"}
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

      <div className="relative z-10 p-6">
        {/* Session Header */}
        <div
          className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-6 mb-6"
          style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-6">
              <h1
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F]"
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  textShadow: "0 0 10px #FFD700",
                }}
              >
                🎪 HOST DASHBOARD
              </h1>
              <div className="text-[#FFD700] text-xl font-bold">
                Game: {gameState.session.gameId}
              </div>
            </div>

            <div className="flex items-center gap-8">
              <button
                onClick={logout}
                className="px-4 py-2 bg-gradient-to-r from-[#FF007F] to-[#DC143C] text-white font-bold rounded-lg hover:from-[#DC143C] hover:to-[#FF007F] transition-all duration-300 text-sm"
                title="Logout"
              >
                🔓 Logout
              </button>
              <div className="text-center">
                <div className="text-white/60 text-sm">PLAYERS</div>
                <div className="text-[#FFD700] text-2xl font-bold">
                  {gameState.session.playerCount}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/60 text-sm">ROUND</div>
                <div className="text-[#FFD700] text-2xl font-bold">
                  {gameState.session.roundNumber}/{gameState.session.maxRounds || 10}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/60 text-sm">STATUS</div>
                <div
                  className={`text-2xl font-bold ${
                    gameState.session.status === "active"
                      ? "text-[#00FF00]"
                      : gameState.session.status === "paused"
                      ? "text-[#FFD700]"
                      : "text-[#FF007F]"
                  }`}
                  style={{ textShadow: "0 0 5px currentColor" }}
                >
                  {gameState.session.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Game Mode Switcher - Only allow switching when game is not active */}
          <div className="flex mt-4 bg-black/60 rounded-xl overflow-hidden">
            <button
              onClick={() => switchGameMode("bingo")}
              disabled={gameState.session.status === "active"}
              className={`flex-1 py-3 px-6 font-bold text-lg transition-all duration-300 ${
                gameState.session.mode === "bingo"
                  ? "bg-[#FFD700] text-black"
                  : "text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              🎲 BINGO MODE
            </button>
            <button
              onClick={() => switchGameMode("trivia")}
              disabled={gameState.session.status === "active"}
              className={`flex-1 py-3 px-6 font-bold text-lg transition-all duration-300 ${
                gameState.session.mode === "trivia"
                  ? "bg-[#FFD700] text-black"
                  : "text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              🧠 TRIVIA MODE
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* Current Ball/Question Display */}
            <div
              className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-8"
              style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
            >
              {gameState.session.mode === "bingo" ? (
                <div className="text-center">
                  <div
                    className="text-[#FFD700] text-xl font-bold mb-4"
                    style={{ textShadow: "0 0 5px #FFD700" }}
                  >
                    CURRENT BALL
                  </div>
                  {gameState.session.currentBall ? (
                    <div
                      className={`inline-block bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black rounded-full w-32 h-32 flex items-center justify-center text-4xl font-bold shadow-2xl ${
                        isDrawing ? "animate-spin" : ""
                      }`}
                      style={{ boxShadow: "0 0 30px #FFD700" }}
                    >
                      {getBallLetter(gameState.session.currentBall)}-
                      {gameState.session.currentBall}
                    </div>
                  ) : (
                    <div className="text-white/60 text-2xl">
                      Ready to draw...
                    </div>
                  )}

                  {gameState.session.drawnBalls.length > 0 && (
                    <div className="mt-6">
                      <div className="text-white/80 text-sm mb-2">
                        DRAWN BALLS ({gameState.session.drawnBalls.length}/75)
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                        {gameState.session.drawnBalls.slice(-10).map((ball) => (
                          <div
                            key={ball}
                            className="bg-white/20 text-[#FFD700] px-2 py-1 rounded text-sm font-bold border border-[#FFD700]/30"
                          >
                            {getBallLetter(ball)}-{ball}
                          </div>
                        ))}
                        {gameState.session.drawnBalls.length > 10 && (
                          <div className="text-white/60 text-sm">
                            +{gameState.session.drawnBalls.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div
                    className="text-[#FFD700] text-xl font-bold mb-4"
                    style={{ textShadow: "0 0 5px #FFD700" }}
                  >
                    TRIVIA MODE
                  </div>
                  {gameState.currentQuestion ? (
                    <div className="space-y-4">
                      <div className="text-white text-xl font-bold">
                        {gameState.currentQuestion.question}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {gameState.currentQuestion.answers.map(
                          (answer, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg font-bold border-2 ${
                                index ===
                                gameState.currentQuestion.correctAnswer
                                  ? "bg-[#00FF00]/20 border-[#00FF00] text-[#00FF00]"
                                  : "bg-white/10 border-white/30 text-white"
                              }`}
                            >
                              {String.fromCharCode(65 + index)}. {answer}
                            </div>
                          )
                        )}
                      </div>
                      <div className="text-[#FFD700]">
                        ⏱️ {gameState.currentQuestion.timeLimit}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/60 text-2xl">
                      Ready for trivia...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {gameState.session.mode === "bingo" ? (
                <button
                  onClick={drawBall}
                  disabled={isDrawing || gameState.session.status !== "active"}
                  className={`group relative py-6 px-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    isDrawing || gameState.session.status !== "active"
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black hover:shadow-2xl"
                  }`}
                  style={{
                    boxShadow:
                      isDrawing || gameState.session.status !== "active"
                        ? "none"
                        : "0 0 20px #FFD700",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  <div className="text-3xl mb-2">🎲</div>
                  {isDrawing ? "DRAWING..." : "DRAW BALL"}
                </button>
              ) : (
                <button
                  onClick={() => setShowQuizManager(true)}
                  disabled={gameState.session.status !== "active"}
                  className={`group relative py-6 px-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    gameState.session.status !== "active"
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-br from-[#00BFFF] to-[#0080FF] text-white hover:shadow-2xl"
                  }`}
                  style={{
                    boxShadow:
                      gameState.session.status !== "active"
                        ? "none"
                        : "0 0 20px #00BFFF",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  <div className="text-3xl mb-2">🧠</div>
                  MANAGE QUIZ
                </button>
              )}

              <button
                onClick={endRound}
                disabled={gameState.session.roundNumber >= (gameState.session.maxRounds || 10)}
                className={`group relative py-6 px-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl ${
                  gameState.session.roundNumber >= (gameState.session.maxRounds || 10)
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-br from-[#FF007F] to-[#DC143C] text-white"
                }`}
                style={{
                  boxShadow: gameState.session.roundNumber >= (gameState.session.maxRounds || 10) 
                    ? "0 0 10px #666" 
                    : "0 0 20px #FF007F",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <div className="text-3xl mb-2">⏹️</div>
                {gameState.session.roundNumber >= (gameState.session.maxRounds || 10) 
                  ? "MAX ROUNDS REACHED" 
                  : "END ROUND"}
              </button>

              <button
                onClick={toggleGameStatus}
                className={`group relative py-6 px-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  gameState.session.status === "active"
                    ? "bg-gradient-to-br from-[#FF8C00] to-[#FF4500] text-white hover:shadow-2xl"
                    : "bg-gradient-to-br from-[#00FF00] to-[#32CD32] text-black hover:shadow-2xl"
                }`}
                style={{
                  boxShadow:
                    gameState.session.status === "active"
                      ? "0 0 20px #FF8C00"
                      : "0 0 20px #00FF00",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <div className="text-3xl mb-2">
                  {gameState.session.status === "active" ? "⏸️" : "▶️"}
                </div>
                {gameState.session.status === "active"
                  ? "PAUSE GAME"
                  : "START GAME"}
              </button>

              <button
                onClick={() => (window.location.href = "/display")}
                className="group relative py-6 px-4 bg-gradient-to-br from-[#9400D3] to-[#8A2BE2] text-white rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl"
                style={{
                  boxShadow: "0 0 20px #9400D3",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <div className="text-3xl mb-2">📺</div>
                PUBLIC VIEW
              </button>
            </div>
          </div>

          {/* Player List */}
          <div
            className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-6"
            style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
          >
            <h3
              className="text-2xl font-bold text-[#FFD700] mb-4"
              style={{ textShadow: "0 0 5px #FFD700" }}
            >
              👥 LIVE PLAYERS
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {gameState.players.map((player) => (
                <div
                  key={player.id}
                  className="bg-white/10 p-4 rounded-lg border border-white/20"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            player.status === "active"
                              ? "bg-[#00FF00]"
                              : "bg-[#FF007F]"
                          }`}
                          style={{ boxShadow: "0 0 5px currentColor" }}
                        ></div>
                        <span className="text-white font-bold">
                          {player.nickname}
                        </span>
                        <span className="text-white/60 text-sm">
                          {player.avatar === "high-roller"
                            ? "🤵"
                            : player.avatar === "showgirl"
                            ? "💃"
                            : player.avatar === "elvis"
                            ? "🕺"
                            : player.avatar === "dealer"
                            ? "🎰"
                            : player.avatar === "lucky-lady"
                            ? "🍀"
                            : "👑"}
                        </span>
                      </div>
                      <div className="text-white/60 text-sm">
                        🏆 {player.wins} wins
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewPlayerCard(player.id)}
                        className="px-3 py-1 bg-[#00BFFF] text-white rounded hover:bg-[#0080FF] transition-colors text-sm"
                        title="View Card"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => announceWinner(player.id)}
                        className="px-3 py-1 bg-[#00FF00] text-black rounded hover:bg-[#32CD32] transition-colors text-sm font-bold"
                        title="Announce Line Winner (or Full Card if line already claimed)"
                      >
                        🏆
                      </button>
                      <button
                        onClick={() => kickPlayer(player.id)}
                        className="px-3 py-1 bg-[#FF007F] text-white rounded hover:bg-[#DC143C] transition-colors text-sm"
                        title="Kick Player"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {gameState.players.length === 0 && (
                <div className="text-center text-white/60 py-8">
                  No players have joined yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Card Viewer Modal */}
      {showPlayerCard && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#FFD700] max-w-md w-full"
            style={{ boxShadow: "0 0 30px #FFD700" }}
          >
            <div className="text-center mb-6">
              <h3
                className="text-2xl font-bold text-[#FFD700] mb-2"
                style={{ textShadow: "0 0 10px #FFD700" }}
              >
                👁️ {showPlayerCard.nickname}'s Card
              </h3>
              <div className="text-white/80">Wins: {showPlayerCard.wins}</div>
            </div>

            {/* Bingo Card Display */}
            <div className="grid grid-cols-5 gap-1 mb-6 bg-black/50 p-4 rounded-lg">
              {["B", "I", "N", "G", "O"].map((letter, colIndex) => (
                <div
                  key={letter}
                  className="text-center text-[#FFD700] font-bold text-lg mb-2"
                >
                  {letter}
                </div>
              ))}
              {showPlayerCard.bingoCard.map((number, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                const cellId = `${row}-${col}`;
                const isMarked = showPlayerCard.markedCells.includes(cellId);
                const isFree = col === 2 && row === 2;

                return (
                  <div
                    key={index}
                    className={`aspect-square flex items-center justify-center text-sm font-bold rounded border-2 ${
                      isMarked
                        ? "bg-[#00BFFF] text-white border-[#00BFFF]"
                        : "bg-white/10 text-white border-white/30"
                    }`}
                  >
                    {isFree ? (
                      <img
                        src="/card.png"
                        alt="Free Space"
                        className="max-w-[70%] max-h-[70%] object-contain"
                        style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.35))" }}
                      />
                    ) : (
                      number
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowPlayerCard(null)}
              className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        
        @keyframes neon-pulse {
          0%, 100% { 
            opacity: 0.8;
            box-shadow: 0 0 10px currentColor;
          }
          50% { 
            opacity: 1;
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-neon-pulse {
          animation: neon-pulse 2s ease-in-out infinite;
        }
        
        button:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}

export default HostPage;