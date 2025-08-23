import React from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [nickname, setNickname] = React.useState("");
  const [sessionCode, setSessionCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedTeam, setSelectedTeam] = React.useState("");
  const [availableTeams, setAvailableTeams] = React.useState([]);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showAdminModal, setShowAdminModal] = React.useState(false);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [adminError, setAdminError] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [activeSessions, setActiveSessions] = React.useState([]);
  const [newSessionId, setNewSessionId] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = React.useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [sessionWinners, setSessionWinners] = React.useState([]);
  const [newSessionMode, setNewSessionMode] = React.useState("bingo");
  const [newSessionRounds, setNewSessionRounds] = React.useState(10);
  const [newSessionBingoMode, setNewSessionBingoMode] = React.useState("manual");


  const loadAvailableTeams = async (sessionId) => {
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list_teams",
          gameId: sessionId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAvailableTeams(result.teams);
      } else {
        setAvailableTeams([]);
      }
    } catch (err) {
      setAvailableTeams([]);
    }
  };

  // Load teams when session code changes
  React.useEffect(() => {
    if (sessionCode.trim()) {
      loadAvailableTeams(sessionCode.trim().toUpperCase());
    }
  }, [sessionCode]);

  const handleJoinGame = () => {
    setShowJoinModal(true);
    setIsAnimating(true);
    setError("");
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleAdminAccess = () => {
    setShowAdminModal(true);
    setAdminError("");
  };

  const authenticateAdmin = async () => {
    if (adminPassword.trim() === "Bianca1236") {
      setIsAuthenticated(true);
      setAdminError("");
      await loadActiveSessions();
    } else {
      setAdminError("Invalid access code. Please try again.");
      setAdminPassword("");
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list_sessions",
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setActiveSessions(result.sessions);
      } else {
        setAdminError(result.error || "Failed to load sessions");
        setActiveSessions([]);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setAdminError("Failed to load sessions");
      setActiveSessions([]);
    }
  };

  const createNewSession = async () => {
    if (!newSessionId.trim()) {
      setAdminError("Please enter a session ID");
      return;
    }

    setIsCreating(true);
    setAdminError("");

    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_session",
          gameId: newSessionId.trim().toUpperCase(),
          gameMode: newSessionMode,
          bingoMode: newSessionBingoMode,
          maxRounds: newSessionRounds,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Store authentication and selected session, then redirect to host
        localStorage.setItem("hostAuthenticated", "true");
        localStorage.setItem("selectedSession", newSessionId.trim().toUpperCase());
        
        // Reset form
        setNewSessionId("");
        setNewSessionMode("bingo");
        setNewSessionRounds(10);
        setNewSessionBingoMode("standard");
        
        // Navigate to host page
        navigate("/host");
      } else {
        setAdminError(result.error || "Failed to create session");
      }
    } catch (err) {
      setAdminError("Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  const selectSession = (gameId) => {
    // Store authentication and selected session, then redirect to host
    localStorage.setItem("hostAuthenticated", "true");
    localStorage.setItem("selectedSession", gameId);
    navigate("/host");
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: sessionId }),
      });
      
      const result = await response.json();
      if (result.success) {
        setSelectedSessionDetail(result);
        
        // Load session winners
        const winnerResponse = await fetch("/api/get-game-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            gameId: sessionId,
            action: "get-winner-history"
          }),
        });
        
        if (winnerResponse.ok) {
          const winnerResult = await winnerResponse.json();
          if (winnerResult.success && winnerResult.winners) {
            const winners = winnerResult.winners
              .map(event => ({
                round: event.data?.roundNumber || event.data?.round || 'Unknown',
                winner: event.data?.nickname || 'Unknown',
                timestamp: event.timestamp,
                totalWins: event.data?.totalWins || 1
              }))
              .reverse(); // Show most recent first
            setSessionWinners(winners);
          } else {
            setSessionWinners([]);
          }
        } else {
          setSessionWinners([]);
        }
      } else {
        setAdminError(result.error || "Failed to load session details");
      }
    } catch (err) {
      console.error("Failed to load session details:", err);
      setAdminError("Failed to load session details");
    }
  };

  const deleteSession = async (gameId) => {
    setIsDeleting(true);
    setAdminError("");

    try {
      // Since we don't have a delete API endpoint, we'll simulate it
      // In a real implementation, you'd create a delete_session action in host-controls
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_session",
          gameId: gameId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Remove from active sessions list
        setActiveSessions(prev => prev.filter(session => session.gameId !== gameId));
        setShowDeleteConfirm(null);
        setSelectedSessionDetail(null);
        setAdminError(""); // Clear any previous errors
      } else {
        setAdminError(result.error || "Failed to delete session");
      }
    } catch (err) {
      setAdminError("Failed to delete session");
    } finally {
      setIsDeleting(false);
    }
  };

  // Removed handlePublicDisplay; Quick Access links removed

  const handleNicknameSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }
    if (!sessionCode.trim()) {
      setError("Please enter a session code");
      return;
    }
    if (!password.trim() || password.length !== 4 || !/^\d{4}$/.test(password)) {
      setError("Please enter a 4-digit password");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const response = await fetch("/api/join-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: sessionCode.trim().toUpperCase(),
          nickname: nickname.trim(),
          password: password.trim(),
          teamId: selectedTeam || null
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store (or update) player data under this session code in bingoSessions
        const sessionKey = sessionCode.trim().toUpperCase();
        const allSessionsRaw = localStorage.getItem("bingoSessions");
        const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};

        const playerData = {
          id: result.player.id,
          nickname: result.player.nickname,
          avatar: result.player.avatar,
          sessionId: sessionKey,
          bingoCard: result.player.bingoCard,
          markedCells: result.player.markedCells || [],
        };

        // Use player-specific key format
        const playerSpecificKey = `session_${sessionKey}_player_${result.player.nickname}`;
        allSessions[playerSpecificKey] = playerData;
        localStorage.setItem("bingoSessions", JSON.stringify(allSessions));

        // Navigate to the session-specific player URL including player name
        const safeName = encodeURIComponent(playerData.nickname || "player");
        navigate(`/player/${sessionKey}/${safeName}`);
      } else {
        setError(result.error || "Failed to join game");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const viewSessionDetail = async (gameId) => {
    await loadSessionDetails(gameId);
  };

  return (
    <div className="min-h-screen bg-[#1A0F2A] relative overflow-hidden">
      {/* Animated Neon Background */}
      <div className="absolute inset-0">
        {/* Bokeh lights */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-xl animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
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

        {/* Floating gold particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#FFD700] rounded-full opacity-60 animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Branding Logo */}
        <div className="text-center mb-16">
          <img
            src="/LogoT.png"
            alt="Vegas Luck Bingo"
            className="mx-auto max-w-[90%] md:max-w-[600px]"
            style={{ filter: "drop-shadow(0 0 20px rgba(255,215,0,0.4))" }}
          />
        </div>

        {/* Action buttons with Vegas slot machine style */}
        <div className="flex flex-col md:flex-row gap-8 items-center mb-12">
          <button
            onClick={handleJoinGame}
            className="group relative px-12 py-6 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold text-2xl rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 active:scale-95 border-4 border-[#FFD700]"
            style={{
              boxShadow:
                "0 0 20px #FFD700, 0 0 40px #FFD700, inset 0 2px 4px rgba(255,255,255,0.3)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFFF00] to-[#FFD700] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
            <span className="relative z-10 flex items-center gap-3">
              🎰 JOIN GAME
            </span>
          </button>

          <button
            onClick={handleAdminAccess}
            className="group relative px-12 py-6 bg-gradient-to-r from-[#FF007F] to-[#DC143C] text-white font-bold text-2xl rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 active:scale-95 border-4 border-[#FF007F]"
            style={{
              boxShadow:
                "0 0 20px #FF007F, 0 0 40px #FF007F, inset 0 2px 4px rgba(255,255,255,0.3)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493] to-[#FF007F] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
            <span className="relative z-10 flex items-center gap-3">
              🔐 ADMIN
            </span>
          </button>
        </div>

        {/* Feature highlights with neon cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div
            className="text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm border-2 border-[#00BFFF] hover:border-[#FFD700] transition-all duration-300"
            style={{ boxShadow: "0 0 15px rgba(0, 191, 255, 0.3)" }}
          >
            <div className="text-4xl mb-4">🎲</div>
            <h3
              className="text-[#00BFFF] font-bold text-xl mb-2"
              style={{ textShadow: "0 0 5px #00BFFF" }}
            >
              LIVE BINGO
            </h3>
            <p className="text-white/80 font-['Lato']">
              Real-time bingo with Vegas-style ball physics and interactive
              cards
            </p>
          </div>
          <div
            className="text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm border-2 border-[#FF007F] hover:border-[#FFD700] transition-all duration-300"
            style={{ boxShadow: "0 0 15px rgba(255, 0, 127, 0.3)" }}
          >
            <div className="text-4xl mb-4">🧠</div>
            <h3
              className="text-[#FF007F] font-bold text-xl mb-2"
              style={{ textShadow: "0 0 5px #FF007F" }}
            >
              TRIVIA NIGHT
            </h3>
            <p className="text-white/80 font-['Lato']">
              Interactive trivia with custom questions and timed challenges
            </p>
          </div>
          <div
            className="text-center p-6 bg-black/60 rounded-lg backdrop-blur-sm border-2 border-[#FFD700] hover:border-[#FF007F] transition-all duration-300"
            style={{ boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)" }}
          >
            <div className="text-4xl mb-4">🏆</div>
            <h3
              className="text-[#FFD700] font-bold text-xl mb-2"
              style={{ textShadow: "0 0 5px #FFD700" }}
            >
              JACKPOT WINS
            </h3>
            <p className="text-white/80 font-['Lato']">
              Celebrate victories with spectacular neon effects and live
              announcements
            </p>
          </div>
        </div>

        {/* Join Game Modal with Session Code */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#FFD700] max-w-md w-full transform transition-all duration-600 ${
                isAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"
              }`}
              style={{ boxShadow: "0 0 30px #FFD700, 0 0 60px #FFD700" }}
            >
              <div className="text-center mb-6">
                <h3
                  className="text-3xl font-bold text-[#FFD700] mb-2"
                  style={{ textShadow: "0 0 10px #FFD700" }}
                >
                  🎰 ENTER THE GAME
                </h3>
                <p className="text-white/80 font-['Lato']">
                  Choose your Vegas identity!
                </p>
              </div>

              <form onSubmit={handleNicknameSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-center">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    className="block text-[#00BFFF] font-bold mb-2 text-center"
                    style={{ textShadow: "0 0 5px #00BFFF" }}
                  >
                    Session Code:
                  </label>
                  <input
                    type="text"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    placeholder="Enter session code (e.g., VB-2025)"
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                    style={{
                      boxShadow: "0 0 10px rgba(0, 191, 255, 0.3)",
                      fontFamily: "Courier New, monospace",
                    }}
                    maxLength={10}
                    disabled={isJoining}
                  />
                </div>

                <div>
                  <label
                    className="block text-[#FF007F] font-bold mb-2 text-center"
                    style={{ textShadow: "0 0 5px #FF007F" }}
                  >
                    Your Nickname:
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname..."
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#FF007F]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300"
                    style={{
                      boxShadow: "0 0 10px rgba(255, 0, 127, 0.3)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                    maxLength={20}
                    disabled={isJoining}
                  />
                </div>

                <div>
                  <label
                    className="block text-[#FFD700] font-bold mb-2 text-center"
                    style={{ textShadow: "0 0 5px #FFD700" }}
                  >
                    4-Digit Password:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPassword(value);
                    }}
                    placeholder="Enter 4-digit password"
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#FFD700]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                    style={{
                      boxShadow: "0 0 10px rgba(255, 215, 0, 0.3)",
                      fontFamily: "Courier New, monospace",
                    }}
                    maxLength={4}
                    disabled={isJoining}
                  />
                  <p className="text-white/60 text-sm mt-2 text-center">
                    Use the same password to reconnect if disconnected
                  </p>
                </div>

                <div>
                  <label
                    className="block text-[#00CED1] font-bold mb-2 text-center"
                    style={{ textShadow: "0 0 5px #00CED1" }}
                  >
                    Select Team (Optional):
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00CED1]/50 rounded-lg text-white text-xl text-center focus:border-[#00CED1] focus:outline-none transition-colors duration-300"
                    style={{
                      boxShadow: "0 0 10px rgba(0, 206, 209, 0.3)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                    disabled={isJoining}
                  >
                    <option value="">No Team</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.playerCount} players)
                      </option>
                    ))}
                  </select>
                  {availableTeams.length === 0 && (
                    <p className="text-white/60 text-sm mt-2 text-center">
                      No teams available. The host can create teams.
                    </p>
                  )}
                </div>

                {/* Removed avatar selection UI */}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="flex-1 py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#00FF00]"
                    style={{
                      boxShadow: "0 0 15px #00FF00",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {isJoining ? "🎰 JOINING..." : "🚀 LET'S PLAY!"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    disabled={isJoining}
                    className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#FFD700] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 0 30px #FFD700, 0 0 60px #FFD700" }}
          >
            <div className="text-center mb-6">
              <h3
                className="text-3xl font-bold text-[#FFD700] mb-2"
                style={{ textShadow: "0 0 10px #FFD700" }}
              >
                🔐 ADMIN ACCESS
              </h3>
              <p className="text-white/80 font-['Lato']">
                Manage game sessions
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="admin-password-entry">
                <div className="space-y-6">
                  {adminError && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-center">
                      {adminError}
                    </div>
                  )}

                  <div>
                    <label
                      className="block text-[#00BFFF] font-bold mb-2 text-center"
                      style={{ textShadow: "0 0 5px #00BFFF" }}
                    >
                      Admin Access Code:
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && authenticateAdmin()}
                      placeholder="Enter admin access code"
                      className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300"
                      style={{
                        boxShadow: "0 0 10px rgba(0, 191, 255, 0.3)",
                      }}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={authenticateAdmin}
                      className="flex-1 py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 border-2 border-[#00FF00]"
                      style={{
                        boxShadow: "0 0 15px #00FF00",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      🚀 ACCESS ADMIN
                    </button>
                    <button
                      onClick={() => setShowAdminModal(false)}
                      className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-session-management">
                <div className="space-y-6">
                  {adminError && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-center">
                      {adminError}
                    </div>
                  )}

                  {/* Active Sessions */}
                  <div>
                    <h4 className="text-[#00BFFF] font-bold text-xl mb-4 text-center" style={{ textShadow: "0 0 5px #00BFFF" }}>
                      Active Sessions
                    </h4>
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {activeSessions.length > 0 ? (
                        activeSessions.map((session) => (
                          <div
                            key={session.gameId}
                            className="bg-black/40 p-4 rounded-lg border border-white/20"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="text-[#FFD700] font-bold text-lg">{session.gameId}</div>
                                <div className="text-white/60 text-sm">
                                  Status: <span className={`font-bold ${
                                    session.status === "active" ? "text-[#00FF00]" : "text-[#FFD700]"
                                  }`}>{session.status}</span> | 
                                  Players: {session.playerCount} | 
                                  Round: {session.roundNumber}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => selectSession(session.gameId)}
                                className="flex-1 py-2 px-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 text-sm"
                                style={{
                                  boxShadow: "0 0 10px #00FF00",
                                  fontFamily: "Montserrat, sans-serif",
                                }}
                              >
                                🎮 ENTER
                              </button>
                              <button
                                onClick={() => viewSessionDetail(session.gameId)}
                                className="flex-1 py-2 px-3 bg-gradient-to-r from-[#00BFFF] to-[#0080FF] text-white font-bold rounded-lg hover:from-[#0080FF] hover:to-[#00BFFF] transition-all duration-300 text-sm"
                                style={{
                                  boxShadow: "0 0 10px #00BFFF",
                                  fontFamily: "Montserrat, sans-serif",
                                }}
                              >
                                📊 DETAILS
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(session.gameId)}
                                className="flex-1 py-2 px-3 bg-gradient-to-r from-[#FF4500] to-[#DC143C] text-white font-bold rounded-lg hover:from-[#DC143C] hover:to-[#FF4500] transition-all duration-300 text-sm"
                                style={{
                                  boxShadow: "0 0 10px #FF4500",
                                  fontFamily: "Montserrat, sans-serif",
                                }}
                              >
                                🗑️ DELETE
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-white/60 py-4">
                          No active sessions found
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Create New Session */}
                  <div className="border-t border-white/20 pt-6">
                    <h4 className="text-[#FF007F] font-bold text-xl mb-4 text-center" style={{ textShadow: "0 0 5px #FF007F" }}>
                      Create New Session
                    </h4>
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={newSessionId}
                        onChange={(e) => setNewSessionId(e.target.value.toUpperCase())}
                        placeholder="Enter new session ID (e.g., VB-2025)"
                        className="w-full px-4 py-3 bg-black/50 border-2 border-[#FF007F]/50 rounded-lg text-white text-xl text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                        style={{
                          boxShadow: "0 0 10px rgba(255, 0, 127, 0.3)",
                          fontFamily: "Courier New, monospace",
                        }}
                        maxLength={15}
                        disabled={isCreating}
                      />
                      
                      {/* Integrated Game Mode Display */}
                      <div className="space-y-2">
                        <label className="block text-[#00BFFF] font-bold text-sm">
                          🎯 Game Mode:
                        </label>
                        <div className="bg-[#FFD700] text-black py-2 px-4 rounded-lg font-bold text-center border-2 border-[#FFD700]"
                             style={{ boxShadow: "0 0 10px #FFD700" }}>
                          🎲🧠 INTEGRATED TRIVIA & BINGO
                        </div>
                        <p className="text-white/60 text-xs text-center">
                          Manual winner announcements • Trivia rounds between bingo
                        </p>
                      </div>



                      {/* Rounds Configuration */}
                        <div className="space-y-2">
                          <label className="block text-[#00FF00] font-bold text-sm">
                            🔢 Number of Rounds:
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="1"
                              max="40"
                              value={newSessionRounds}
                              onChange={(e) => setNewSessionRounds(parseInt(e.target.value))}
                              disabled={isCreating}
                              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                              style={{
                                background: `linear-gradient(to right, #00FF00 0%, #00FF00 ${(newSessionRounds - 1) / 39 * 100}%, #333 ${(newSessionRounds - 1) / 39 * 100}%, #333 100%)`
                              }}
                            />
                            <span className="text-[#00FF00] font-bold text-lg min-w-[3rem] text-center">
                              {newSessionRounds}
                            </span>
                          </div>
                          <div className="text-white/60 text-xs text-center">
                            Rounds: 1-40 (Default: 10)
                          </div>
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
                          {isCreating ? "🎰 CREATING..." : "🚀 CREATE & HOST"}
                        </button>
                        <button
                          onClick={() => {
                            setShowAdminModal(false);
                            setIsAuthenticated(false);
                            setAdminPassword("");
                            setNewSessionId("");
                            setNewSessionMode("bingo");
                            setNewSessionRounds(10);
                            setNewSessionBingoMode("standard");
                          }}
                          disabled={isCreating}
                          className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                          style={{ fontFamily: "Montserrat, sans-serif" }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#FFD700] max-w-lg w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 0 30px #FFD700, 0 0 60px #FFD700" }}
          >
            <div className="text-center mb-6">
              <h3
                className="text-3xl font-bold text-[#FFD700] mb-2"
                style={{ textShadow: "0 0 10px #FFD700" }}
              >
                🎮 SESSION DETAILS
              </h3>
              <div className="text-[#00BFFF] text-2xl font-bold">{selectedSessionDetail.gameId}</div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-black/40 p-4 rounded-lg border border-white/20">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Status:</span>
                    <div className={`font-bold text-lg ${
                      selectedSessionDetail.session.status === "active" ? "text-[#00FF00]" : 
                      selectedSessionDetail.session.status === "paused" ? "text-[#FFD700]" : 
                      "text-[#FF007F]"
                    }`}>
                      {selectedSessionDetail.session.status.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60">Mode:</span>
                    <div className="text-[#FFD700] font-bold text-lg">
                      {selectedSessionDetail.session.mode.toUpperCase()}
                      {selectedSessionDetail.session.bingoMode && (
                        <span className="text-[#00FF00] text-sm ml-2">
                          ({selectedSessionDetail.session.bingoMode.toUpperCase()})
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60">Players:</span>
                    <div className="text-[#00BFFF] font-bold text-lg">
                      {selectedSessionDetail.session.playerCount}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60">Round:</span>
                    <div className="text-[#FF007F] font-bold text-lg">
                      {selectedSessionDetail.session.roundNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60">Current Ball:</span>
                    <div className="text-[#FFD700] font-bold text-lg">
                      {selectedSessionDetail.session.currentBall || "None"}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60">Balls Drawn:</span>
                    <div className="text-white font-bold text-lg">
                      {selectedSessionDetail.session.drawnBalls.length}/75
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Players */}
              {selectedSessionDetail.players.length > 0 && (
                <div className="bg-black/40 p-4 rounded-lg border border-white/20">
                  <h4 className="text-[#00BFFF] font-bold mb-3">Active Players:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedSessionDetail.players.map((player) => (
                      <div key={player.id} className="flex justify-between items-center text-sm">
                        <span className="text-white">
                          {player.avatar === "high-roller" ? "🤵" :
                           player.avatar === "showgirl" ? "💃" :
                           player.avatar === "elvis" ? "🕺" :
                           player.avatar === "dealer" ? "🎰" :
                           player.avatar === "lucky-lady" ? "🍀" : "👑"} {player.nickname}
                        </span>
                        <span className="text-[#FFD700]">🏆 {player.wins}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Display Winners */}
            <div className="bg-black/40 p-4 rounded-lg border border-[#00FF00]/30">
              <h4 className="text-[#00FF00] font-bold mb-3">🏆 Session Winners:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {sessionWinners.length > 0 ? (
                  sessionWinners.map((winner, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-white/10 p-2 rounded border border-[#00FF00]/20">
                      <div className="flex items-center gap-2">
                        <span className="text-[#00FF00] font-bold">🏆</span>
                        <span className="text-white font-bold">{winner.winner}</span>
                        <span className="text-[#FFD700] text-xs">Round {winner.round}</span>
                      </div>
                      <div className="text-white/60 text-xs">
                        {new Date(winner.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-white/60 py-4">
                    <div className="text-2xl mb-1">🏆</div>
                    <div>No winners yet</div>
                    <div className="text-xs mt-1">Winners will appear here after rounds end</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => selectSession(selectedSessionDetail.gameId)}
                className="flex-1 py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300 transform hover:scale-105 border-2 border-[#00FF00]"
                style={{
                  boxShadow: "0 0 15px #00FF00",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                🎮 ENTER SESSION
              </button>
              <button
                onClick={() => setShowDeleteConfirm(selectedSessionDetail.gameId)}
                className="flex-1 py-3 bg-gradient-to-r from-[#FF4500] to-[#DC143C] text-white font-bold rounded-lg hover:from-[#DC143C] hover:to-[#FF4500] transition-all duration-300 transform hover:scale-105 border-2 border-[#FF4500]"
                style={{
                  boxShadow: "0 0 15px #FF4500",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                🗑️ DELETE SESSION
              </button>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="w-full py-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#2D1B3D] to-[#1A0F2A] p-8 rounded-2xl border-4 border-[#FF4500] max-w-md w-full"
            style={{ boxShadow: "0 0 30px #FF4500, 0 0 60px #FF4500" }}
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3
                className="text-3xl font-bold text-[#FF4500] mb-4"
                style={{ textShadow: "0 0 10px #FF4500" }}
              >
                DELETE SESSION
              </h3>
              <p className="text-white/80 mb-2">
                Are you sure you want to delete session:
              </p>
              <div className="text-[#FFD700] font-bold text-xl">{showDeleteConfirm}</div>
              <p className="text-red-300 text-sm mt-4">
                This action cannot be undone. All players will be disconnected.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => deleteSession(showDeleteConfirm)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-gradient-to-r from-[#FF4500] to-[#DC143C] text-white font-bold rounded-lg hover:from-[#DC143C] hover:to-[#FF4500] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#FF4500]"
                style={{
                  boxShadow: "0 0 15px #FF4500",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {isDeleting ? "🗑️ DELETING..." : "🗑️ DELETE"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

export default HomePage;