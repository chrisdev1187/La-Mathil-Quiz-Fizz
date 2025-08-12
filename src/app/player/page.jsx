import React from "react";
import { useNavigate } from "react-router-dom";

function PlayerPage() {
  const navigate = useNavigate();
  const [gameState, setGameState] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [player, setPlayer] = React.useState(null);
  const [selectedSession, setSelectedSession] = React.useState("VB-2025");
  const [showJoinForm, setShowJoinForm] = React.useState(false);
  const [joinForm, setJoinForm] = React.useState({
    nickname: "",
    avatar: "high-roller",
    sessionId: "VB-2025",
  });
  const [isJoining, setIsJoining] = React.useState(false);
  const [highlightedRow, setHighlightedRow] = React.useState(null);

  // Load game state and player data on mount and set up polling
  React.useEffect(() => {
    // Check if player is already in localStorage
    const savedPlayer = localStorage.getItem("bingoPlayer");
    if (savedPlayer) {
      const playerData = JSON.parse(savedPlayer);
      setPlayer(playerData);
      setSelectedSession(playerData.sessionId || "VB-2025");
    } else {
      setShowJoinForm(true);
    }

    loadGameState();
    const interval = setInterval(loadGameState, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [selectedSession]);

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

  const joinGame = async () => {
    if (!joinForm.nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const response = await fetch("/api/join-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: joinForm.sessionId.toUpperCase(),
          nickname: joinForm.nickname.trim(),
          avatar: joinForm.avatar,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const playerData = {
          id: result.player.id,
          nickname: result.player.nickname,
          avatar: result.player.avatar,
          sessionId: joinForm.sessionId.toUpperCase(),
          bingoCard: result.player.bingoCard,
          markedCells: result.player.markedCells || [],
        };

        setPlayer(playerData);
        setSelectedSession(joinForm.sessionId.toUpperCase());
        localStorage.setItem("bingoPlayer", JSON.stringify(playerData));
        setShowJoinForm(false);

        // Reload game state
        setTimeout(() => loadGameState(), 500);
      } else {
        setError(result.error || "Failed to join game");
      }
    } catch (err) {
      setError("Failed to join game");
    } finally {
      setIsJoining(false);
    }
  };

  const markCell = async (row, col) => {
    if (!player || !gameState) return;

    const cellId = `${row}-${col}`;
    const isAlreadyMarked = player.markedCells.includes(cellId);

    // Don't allow unmarking cells
    if (isAlreadyMarked) return;

    // Check if this number has been called
    const cellNumber = player.bingoCard[row * 5 + col];
    const isFree = col === 2 && row === 2;

    if (!isFree && !gameState.session.drawnBalls.includes(cellNumber)) {
      setError("This number hasn't been called yet!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const response = await fetch("/api/update-player-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          cellId: cellId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const updatedMarkedCells = [...player.markedCells, cellId];
        const updatedPlayer = { ...player, markedCells: updatedMarkedCells };
        setPlayer(updatedPlayer);
        localStorage.setItem("bingoPlayer", JSON.stringify(updatedPlayer));

        // Check for bingo
        const bingoResult = checkForBingo(updatedMarkedCells);
        if (bingoResult) {
          alert(
            "🎉 BINGO! 🎉\nYou have a winning pattern! Call out to the host!"
          );
          // Add logic to highlight the winning row/column/diagonal
          // and play a sound.
          if (bingoResult.type === 'row') {
            // Highlight row logic
            setHighlightedRow(bingoResult.index);
            setTimeout(() => setHighlightedRow(null), 3000); // Remove highlight after 3 seconds
          }
          // Play sound
          const audio = new Audio('/bellsound.mp3'); // Updated path to branding directory
          audio.play().catch(e => console.error("Error playing sound:", e));
        }
      } else {
        setError(result.error || "Failed to mark cell");
      }
    } catch (err) {
      setError("Failed to mark cell");
    }
  };

  const checkForBingo = (markedCells) => {
    // Check rows
    for (let row = 0; row < 5; row++) {
      let rowComplete = true;
      for (let col = 0; col < 5; col++) {
        const cellId = `${row}-${col}`;
        const isFree = col === 2 && row === 2;
        if (!isFree && !markedCells.includes(cellId)) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) return { type: 'row', index: row }; // Return row index if complete
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      let colComplete = true;
      for (let row = 0; row < 5; row++) {
        const cellId = `${row}-${col}`;
        const isFree = col === 2 && row === 2;
        if (!isFree && !markedCells.includes(cellId)) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) return { type: 'column', index: col }; // Return column index if complete
    }

    // Check diagonals
    let diag1Complete = true;
    let diag2Complete = true;

    for (let i = 0; i < 5; i++) {
      const cellId1 = `${i}-${i}`;
      const cellId2 = `${i}-${4 - i}`;
      const isFree1 = i === 2;
      const isFree2 = i === 2;

      if (!isFree1 && !markedCells.includes(cellId1)) {
        diag1Complete = false;
      }
      if (!isFree2 && !markedCells.includes(cellId2)) {
        diag2Complete = false;
      }
    }

    if (diag1Complete) return { type: 'diagonal', index: 1 };
    if (diag2Complete) return { type: 'diagonal', index: 2 };

    return null;
  };

  const leaveGame = () => {
    localStorage.removeItem("bingoPlayer");
    setPlayer(null);
    setShowJoinForm(true);
    setGameState(null);
  };

  const getBallLetter = (number) => {
    if (number <= 15) return "B";
    if (number <= 30) return "I";
    if (number <= 45) return "N";
    if (number <= 60) return "G";
    return "O";
  };

  const getBallColorClass = (number) => {
    if (number <= 15) return "bg-blue-500 border-blue-600"; // B (Blue)
    if (number <= 30) return "bg-red-500 border-red-600"; // I (Red)
    if (number <= 45) return "bg-white text-black border-gray-400"; // N (White)
    if (number <= 60) return "bg-green-500 border-green-600"; // G (Green)
    return "bg-yellow-500 border-yellow-600"; // O (Yellow)
  };

  const getAvatarEmoji = (avatar) => {
    switch (avatar) {
      case "high-roller":
        return "🤵";
      case "showgirl":
        return "💃";
      case "elvis":
        return "🕺";
      case "dealer":
        return "🎰";
      case "lucky-lady":
        return "🍀";
      default:
        return "👑";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-[#FFD700] text-2xl font-bold animate-pulse">
          🎰 Loading Vegas Luck Bingo...
        </div>
      </div>
    );
  }

  // Show join form if no player or game not found
  if (showJoinForm || (!gameState && error.includes("not found"))) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] relative overflow-hidden">
        {/* Animated Neon Background */}
        <div className="absolute inset-0">
          {/* Bokeh lights */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full blur-xl animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${15 + Math.random() * 30}px`,
                  height: `${15 + Math.random() * 30}px`,
                  backgroundColor: ["#00BFFF", "#FF007F", "#FFD700", "#00FF00"][
                    Math.floor(Math.random() * 4)
                  ],
                  animationDelay: `${Math.random() * 6}s`,
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
            className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-8 max-w-md w-full"
            style={{ boxShadow: "0 0 30px rgba(255, 215, 0, 0.3)" }}
          >
            <h1
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F] mb-6 text-center"
              style={{
                fontFamily: "Impact, Arial Black, sans-serif",
                textShadow: "0 0 10px #FFD700",
              }}
            >
              🎪 JOIN THE GAME
            </h1>

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
                  Session ID:
                </label>
                <input
                  type="text"
                  value={joinForm.sessionId}
                  onChange={(e) =>
                    setJoinForm({
                      ...joinForm,
                      sessionId: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Enter session ID"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                  style={{ boxShadow: "0 0 10px rgba(0, 191, 255, 0.3)" }}
                  maxLength={10}
                  disabled={isJoining}
                />
              </div>

              <div>
                <label
                  className="block text-[#FF007F] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #FF007F" }}
                >
                  Your Nickname:
                </label>
                <input
                  type="text"
                  value={joinForm.nickname}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, nickname: e.target.value })
                  }
                  placeholder="Enter your nickname"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#FF007F]/50 rounded-lg text-white focus:border-[#FFD700] focus:outline-none transition-colors duration-300"
                  style={{ boxShadow: "0 0 10px rgba(255, 0, 127, 0.3)" }}
                  maxLength={20}
                  disabled={isJoining}
                />
              </div>

              <div>
                <label
                  className="block text-[#00FF00] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #00FF00" }}
                >
                  Choose Your Avatar:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "high-roller", emoji: "🤵", name: "High Roller" },
                    { id: "showgirl", emoji: "💃", name: "Showgirl" },
                    { id: "elvis", emoji: "🕺", name: "Elvis" },
                    { id: "dealer", emoji: "🎰", name: "Dealer" },
                    { id: "lucky-lady", emoji: "🍀", name: "Lucky Lady" },
                    { id: "vip", emoji: "👑", name: "VIP" },
                  ].map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() =>
                        setJoinForm({ ...joinForm, avatar: avatar.id })
                      }
                      disabled={isJoining}
                      className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                        joinForm.avatar === avatar.id
                          ? "bg-[#FFD700] border-[#FFD700] text-black"
                          : "bg-white/10 border-white/30 text-white hover:border-[#FFD700]/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{avatar.emoji}</div>
                      <div className="text-xs font-bold">{avatar.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={joinGame}
                disabled={isJoining}
                className="w-full py-4 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold text-xl rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#00FF00]"
                style={{
                  boxShadow: "0 0 20px #00FF00",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {isJoining ? "🎰 JOINING..." : "🚀 JOIN GAME"}
              </button>
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
        `}</style>
      </div>
    );
  }

  if (!gameState || !player) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">
            {error || "Game session not found"}
          </div>
          <button
            onClick={() => setShowJoinForm(true)}
            className="px-6 py-3 bg-[#FFD700] text-black font-bold rounded-lg hover:bg-[#FFA500] transition-colors"
          >
            Join Different Game
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
          {[...Array(8)].map((_, i) => (
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
        {/* Header */}
        <div
          className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-6 mb-6"
          style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              {/* <h1
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F]"
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  textShadow: "0 0 10px #FFD700",
                }}
              >
                🎪 VEGAS LUCK BINGO
              </h1> */}
              <img src="/LogoT.png" alt="Vegas Luck Bingo Logo" className="h-12 w-auto"/>
              <h1
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F]"
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  textShadow: "0 0 10px #FFD700",
                }}
              >
                Welcome {player.nickname}
              </h1>
              <div className="text-[#FFD700] text-lg font-bold">
                {gameState.session.gameId}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{getAvatarEmoji(player.avatar)}</div>
                <div
                  className="text-[#00BFFF] font-bold"
                  style={{ textShadow: "0 0 5px #00BFFF" }}
                >
                  {player.nickname}
                </div>
              </div>
              <button
                onClick={leaveGame}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Bingo Card */}
          <div className="xl:col-span-2">
            <div
              className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-8"
              style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
            >
              <h2
                className="text-2xl font-bold text-[#FFD700] mb-6 text-center"
                style={{ textShadow: "0 0 10px #FFD700" }}
              >
                🎯 YOUR BINGO CARD
              </h2>

              {/* Bingo Card Grid */}
              <div className="bg-white/10 p-6 rounded-xl">
                {/* Header Row */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {["B", "I", "N", "G", "O"].map((letter, index) => (
                    <div
                      key={letter}
                      className="text-center text-[#FFD700] font-bold text-2xl py-2"
                      style={{ textShadow: "0 0 10px #FFD700" }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                {/* Bingo Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {player.bingoCard.map((number, index) => {
                    const row = Math.floor(index / 5);
                    const col = index % 5;
                    const cellId = `${row}-${col}`;
                    const isMarked = player.markedCells.includes(cellId);
                    const isFree = col === 2 && row === 2;
                    const isCalled =
                      gameState.session.drawnBalls.includes(number);
                    const isHighlighted = highlightedRow === row;

                    return (
                      <button
                        key={index}
                        onClick={() => markCell(row, col)}
                        disabled={isMarked || (!isFree && !isCalled)}
                        className={`aspect-square flex items-center justify-center text-lg font-bold rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                          gameState.session.status !== "active"
                            ? // Game not started - gray/black cards
                              isFree
                                ? "bg-gray-600 text-gray-300 border-gray-500"
                                : "bg-gray-800 text-gray-400 border-gray-600 cursor-not-allowed"
                            : // Game active - white cards with yellow text
                              isFree
                                ? "bg-[#FFD700] text-black border-[#FFD700]"
                                : isMarked
                                ? "bg-[#00BFFF] text-white border-[#00BFFF] animate-pulse"
                                : isCalled
                                ? "bg-white text-[#FFD700] border-[#FFD700] hover:bg-gray-100 shadow-md"
                                : "bg-white text-[#FFD700] border-gray-300 hover:bg-gray-50"
                        } ${
                          isHighlighted ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#1A0F2A]" : ""
                        }`}
                        style={{
                          ...(isMarked
                            ? { boxShadow: "0 0 15px #00BFFF" }
                            : isCalled && !isMarked && gameState.session.status === "active"
                            ? { boxShadow: "0 0 10px #FFD700" }
                            : {})
                        }}
                      >
                        {isFree ? (
                          <img src="/LogoT.png" alt="Free Space" className="w-full h-full object-cover rounded-md" />
                        ) : (
                          number
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="space-y-6">
            {/* Current Ball */}
            <div
              className="bg-black/80 backdrop-blur-sm border-2 border-[#FF007F] rounded-2xl p-6"
              style={{ boxShadow: "0 0 20px rgba(255, 0, 127, 0.3)" }}
            >
              <h3
                className="text-xl font-bold text-[#FF007F] mb-4"
                style={{ textShadow: "0 0 10px #FF007F" }}
              >
                🎲 CURRENT BALL
              </h3>
              <div className="text-center">
                {gameState.session.currentBall ? (
                  <div
                    className="bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black rounded-full w-20 h-20 flex items-center justify-center text-2xl font-bold mx-auto shadow-2xl"
                    style={{ boxShadow: "0 0 20px #FFD700" }}
                  >
                    {getBallLetter(gameState.session.currentBall)}-
                    {gameState.session.currentBall}
                  </div>
                ) : (
                  <div className="text-white/60 text-lg">
                    Waiting for next ball...
                  </div>
                )}
              </div>
            </div>

            {/* Game Status */}
            <div
              className="bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-6"
              style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
            >
              <h3
                className="text-xl font-bold text-[#00BFFF] mb-4"
                style={{ textShadow: "0 0 10px #00BFFF" }}
              >
                📊 GAME STATUS
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/80">Round:</span>
                  <span className="text-[#FFD700] font-bold">
                    {gameState.session.roundNumber}/{gameState.session.maxRounds || 10}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Status:</span>
                  <span
                    className={`font-bold ${
                      gameState.session.status === "active"
                        ? "text-[#00FF00]"
                        : "text-[#FF007F]"
                    }`}
                  >
                    {gameState.session.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Players:</span>
                  <span className="text-[#00BFFF] font-bold">
                    {gameState.session.playerCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Balls Called:</span>
                  <span className="text-[#FF007F] font-bold">
                    {gameState.session.drawnBalls.length}/75
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Balls */}
            <div
              className="bg-black/80 backdrop-blur-sm border-2 border-[#00FF00] rounded-2xl p-6"
              style={{ boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)" }}
            >
              <h3
                className="text-xl font-bold text-[#00FF00] mb-4"
                style={{ textShadow: "0 0 10px #00FF00" }}
              >
                🎯 Recent Draws
              </h3>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {gameState.session.drawnBalls
                  .slice(-12)
                  .reverse()
                  .map((ball, index) => (
                    <div
                      key={ball}
                      className={`aspect-square flex items-center justify-center text-xs font-bold rounded border-2
                        ${getBallColorClass(ball)}
                        ${index === 0 ? "animate-pulse" : ""}
                      `}
                      style={
                        index === 0 ? { boxShadow: "0 0 10px #FFD700" } : {}
                      }
                    >
                      {getBallLetter(ball)}-{ball}
                    </div>
                  ))}
              </div>
              {gameState.session.drawnBalls.length === 0 && (
                <div className="text-center text-white/60 py-4">
                  No balls called yet
                </div>
              )}
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
        
        button:hover:not(:disabled) {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}

export default PlayerPage;