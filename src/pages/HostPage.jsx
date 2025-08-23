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
    category: "general",
    difficulty: "medium",
    mediaUrl: null,
  });
  const [showPlayerCard, setShowPlayerCard] = React.useState(null);
  const [showTeamsModal, setShowTeamsModal] = React.useState(false);
  const [teams, setTeams] = React.useState([]);
  const [editingTeam, setEditingTeam] = React.useState(null);
  const [newTeam, setNewTeam] = React.useState({ name: "", color: "#FFD700" });
  const [activeTab, setActiveTab] = React.useState("bingo"); // Track current tab
  // Initialize empty; we'll hydrate from localStorage
  const [selectedSession, setSelectedSession] = React.useState("");
  const [showCreateSession, setShowCreateSession] = React.useState(false);
  const [newSessionId, setNewSessionId] = React.useState("");
  const [newSessionMode, setNewSessionMode] = React.useState("bingo");
  const [newSessionRounds, setNewSessionRounds] = React.useState(10);
  const [newSessionBingoMode, setNewSessionBingoMode] = React.useState("manual");
  const [isCreating, setIsCreating] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [highlightActive, setHighlightActive] = React.useState(false);
  const highlightTimerRef = React.useRef(null);
  const [recentDraws, setRecentDraws] = React.useState([]);
  const [highlightedPattern, setHighlightedPattern] = React.useState(null);
  const [previousRoundWinner, setPreviousRoundWinner] = React.useState(null);
  const [previousWinners, setPreviousWinners] = React.useState([]);
  const [questions, setQuestions] = React.useState([]);
  const [questionResults, setQuestionResults] = React.useState(null);
  const [showDatabaseControl, setShowDatabaseControl] = React.useState(false);
  const [isClearingData, setIsClearingData] = React.useState(false);
  const [showQuizPicker, setShowQuizPicker] = React.useState(false);
  const [availableThemes, setAvailableThemes] = React.useState([]);
  const [selectedTheme, setSelectedTheme] = React.useState(null);
  const [themeCategories, setThemeCategories] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = React.useState('all');
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Bell sound function for manual winner announcements
  const playBellSound = React.useCallback((winType) => {
    // Play bell sound for manual winner announcements (both line and full card)
    const audio = new Audio('/bellsound.mp3');
    audio.play().catch(e => console.error("Error playing bell sound:", e));
  }, []);

  // Hydrate selected session from localStorage ASAP
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedSession");
      if (saved) setSelectedSession(saved);
    } catch {}
  }, []);

  // Check authentication on mount
  React.useEffect(() => {
    const savedAuth = localStorage.getItem("hostAuthenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Load game state on interval when ready
  React.useEffect(() => {
    if (!isAuthenticated || !selectedSession) return;
    
    // Add a small delay for newly created sessions
    const timer = setTimeout(() => {
      loadGameState();
    }, 1000); // 1 second delay
    
    const interval = setInterval(loadGameState, 2000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [selectedSession, isAuthenticated]);

  const loadGameState = async () => {
    if (!selectedSession) return;
    try {
      console.log("HostPage - Loading game state for session:", selectedSession);
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedSession }),
      });
      const result = await response.json();
      console.log("HostPage - Game state response:", result);
      if (result.success) {
        setGameState(result);
        setError("");
        setLoading(false);
        
        // Fetch all winner events for this session
        console.log("HostPage - Fetching winner history...");
        const winnerResponse = await fetch("/api/get-game-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            gameId: selectedSession,
            action: "get-winner-history"
          }),
        });
        
        if (winnerResponse.ok) {
          const winnerResult = await winnerResponse.json();
          if (winnerResult.success && winnerResult.winners) {
            console.log("HostPage - All winner events:", winnerResult.winners);
            const winners = winnerResult.winners
              .map(event => ({
                round: event.data?.roundNumber || event.data?.round || 'Unknown',
                winner: event.data?.nickname || 'Unknown',
                winType: event.data?.winType || 'Unknown',
                timestamp: event.timestamp,
                totalWins: event.data?.totalWins || 1
              }))
              .reverse(); // Show most recent first
            console.log("HostPage - Processed all winners:", winners);
            console.log("HostPage - Setting previous winners count:", winners.length);
            setPreviousWinners(winners);
          } else {
            // No winners found, set empty array
            console.log("HostPage - No winners found in history");
            setPreviousWinners([]);
          }
        } else {
          // Fallback to recent events if winner history endpoint not available
          console.log("HostPage - Winner history endpoint failed, using recent events");
          if (result.recentEvents) {
            const winners = result.recentEvents
              .filter(event => event.type === 'winner_announced')
              .map(event => {
                console.log("HostPage - Winner event data:", event);
                return {
                  round: event.data?.roundNumber || event.data?.round || 'Unknown',
                  winner: event.data?.nickname || 'Unknown',
                  winType: event.data?.winType || 'Unknown',
                  timestamp: event.timestamp,
                  totalWins: event.data?.totalWins || 1
                };
              })
              .reverse(); // Show most recent first
            console.log("HostPage - Processed winners from recent events:", winners);
            setPreviousWinners(winners);
          } else {
            setPreviousWinners([]);
          }
        }
      } else {
        console.log("HostPage - Game state error:", result.error);
        setError(result.error || "Failed to load game state");
        setLoading(false);
      }
    } catch (err) {
      console.error("HostPage - Error loading game state:", err);
      setError("Connection error");
      setLoading(false);
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
          gameMode: newSessionMode,
          bingoMode: newSessionBingoMode,
          maxRounds: newSessionRounds,
        }),
      });
      const result = await response.json();
      if (result.success) {
        const newId = newSessionId.trim().toUpperCase();
        localStorage.setItem("selectedSession", newId);
        setSelectedSession(newId);
        setShowCreateSession(false);
        setNewSessionId("");
        setNewSessionMode("bingo");
        setNewSessionRounds(10);
        setNewSessionBingoMode("standard");
        setError("");
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
      console.log("HostPage - Ending round for session:", selectedSession);
      console.log("HostPage - Current previous winners count before end round:", previousWinners.length);
      
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
        console.log("HostPage - Round ended successfully:", result.message);
        alert(`🎪 ${result.message}`);
        console.log("HostPage - About to reload game state...");
        await loadGameState(); // Refresh state
        console.log("HostPage - Game state reloaded after end round");
      } else {
        console.error("HostPage - Failed to end round:", result.error);
        setError(result.error || "Failed to end round");
      }
    } catch (err) {
      console.error("HostPage - Error ending round:", err);
      setError("Failed to end round");
    }
  };

  const announceWinner = async (playerId) => {
    try {
      console.log("HostPage - Announcing winner for player:", playerId);
      console.log("HostPage - Current previous winners count before announce:", previousWinners.length);
      
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
        console.log("HostPage - Winner announced successfully:", result.message);
        
        // Play bell sound for full card winners in Standard mode
        if (gameState?.session?.bingoMode === 'standard') {
          // Check if this is a full card winner (1st prize)
          if (gameState.session.fullCardWinnerId === playerId && gameState.session.fullCardPrizeClaimed) {
            playBellSound('full_card');
          }
        }
        
        alert(`🏆 ${result.message} 🎉`);
        console.log("HostPage - About to reload game state after announce...");
        await loadGameState(); // Refresh state
        console.log("HostPage - Game state reloaded after announce winner");
      } else {
        console.error("HostPage - Failed to announce winner:", result.error);
        setError(result.error || "Failed to announce winner");
      }
    } catch (err) {
      console.error("HostPage - Error announcing winner:", err);
      setError("Failed to announce winner");
    }
  };

  const announceWinnerManual = async (playerId, winType) => {
    try {
      console.log("HostPage - Manual winner announcement for player:", playerId, "winType:", winType);
      
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "announce_winner_manual",
          gameId: selectedSession,
          playerId,
          winType,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("HostPage - Manual winner announced successfully:", result.message);
        
        // Play bell sound for manual winner announcement
        playBellSound(winType);
        
        alert(`🏆 ${result.message} 🎉`);
        await loadGameState(); // Refresh state
      } else {
        console.error("HostPage - Failed to announce manual winner:", result.error);
        setError(result.error || "Failed to announce winner");
      }
    } catch (err) {
      console.error("HostPage - Error announcing manual winner:", err);
      setError("Failed to announce winner");
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
    if (number >= 1 && number <= 15) return "B";
    if (number >= 16 && number <= 30) return "I";
    if (number >= 31 && number <= 45) return "N";
    if (number >= 46 && number <= 60) return "G";
    return "O";
  };

  // Replace remaining window.location navigations
  const goHome = () => navigate("/");
  const goDisplay = () => navigate("/display");

  // Team management functions
  const loadTeams = async () => {
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list_teams",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTeams(result.teams);
      } else {
        setError(result.error || "Failed to load teams");
      }
    } catch (err) {
      setError("Failed to load teams");
    }
  };

  const createTeam = async () => {
    if (!newTeam.name.trim()) {
      setError("Please enter a team name");
      return;
    }

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_team",
          gameId: selectedSession,
          teamName: newTeam.name.trim(),
          teamColor: newTeam.color,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTeams([...teams, result.team]);
        setNewTeam({ name: "", color: "#FFD700" });
        setError("");
      } else {
        setError(result.error || "Failed to create team");
      }
    } catch (err) {
      setError("Failed to create team");
    }
  };

  const updateTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      setError("Please enter a team name");
      return;
    }

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_team",
          teamId: editingTeam.id,
          teamName: editingTeam.name.trim(),
          teamColor: editingTeam.color,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTeams(teams.map(team => 
          team.id === editingTeam.id ? { ...team, name: editingTeam.name, color: editingTeam.color } : team
        ));
        setEditingTeam(null);
        setError("");
      } else {
        setError(result.error || "Failed to update team");
      }
    } catch (err) {
      setError("Failed to update team");
    }
  };

  const deleteTeam = async (teamId, teamName) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"?`)) {
      return;
    }

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_team",
          teamId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTeams(teams.filter(team => team.id !== teamId));
        setError("");
      } else {
        setError(result.error || "Failed to delete team");
      }
    } catch (err) {
      setError("Failed to delete team");
    }
  };

  // Trivia Management Functions
  const loadQuestions = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list_questions",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Store questions in state for the modal
        setQuestions(result.questions);
      } else {
        setError(result.error || "Failed to load questions");
      }
    } catch (err) {
      setError("Failed to load questions");
    }
  };

  const loadAvailableThemes = async () => {
    try {
      console.log("HostPage - Loading available themes from database...");
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_available_quizzes",
        }),
      });

      console.log("HostPage - API response status:", response.status);
      const result = await response.json();
      console.log("HostPage - API response:", result);
      
      if (result.success && result.themes) {
        console.log("HostPage - Available themes loaded:", result.themes.length);
        console.log("HostPage - Sample theme:", result.themes[0]);
        setAvailableThemes(result.themes);
        
        // Extract unique categories and difficulties
        const categories = [...new Set(result.themes.map(t => t.category))].sort();
        const difficulties = [...new Set(result.themes.map(t => t.difficulty))].sort();
        
        setThemeCategories(categories);
        console.log("HostPage - Categories found:", categories);
        console.log("HostPage - Difficulties found:", difficulties);
      } else {
        console.error("HostPage - Failed to load themes:", result.error || "No themes data received");
        setError(result.error || "Failed to load available themes");
      }
    } catch (err) {
      console.error("HostPage - Error loading themes:", err);
      setError("Failed to load available themes");
    }
  };

  const selectAndStartTheme = async (theme) => {
    try {
      console.log("Selecting and starting theme:", theme);
      
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_theme_quiz",
          gameId: selectedSession,
          themeId: theme.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Theme quiz started successfully:", result.message);
        setShowQuizPicker(false);
        setSelectedTheme(null);
        await loadGameState(); // Refresh state
        setError("");
      } else {
        setError(result.error || "Failed to start theme quiz");
      }
    } catch (err) {
      console.error("Error selecting theme:", err);
      setError("Failed to select and start theme quiz");
    }
  };

  const startQuestion = async (questionId) => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_question",
          gameId: selectedSession,
          questionData: { id: questionId },
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Question started successfully:", result.message);
        await loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to start question");
      }
    } catch (err) {
      setError("Failed to start question");
    }
  };

  const endQuestion = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_question",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Question ended successfully:", result.message);
        setQuestionResults(result.results);
        await loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to end question");
      }
    } catch (err) {
      setError("Failed to end question");
    }
  };

  const nextQuestion = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next_question",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Next question started successfully:", result.message);
        await loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to start next question");
      }
    } catch (err) {
      setError("Failed to start next question");
    }
  };

  const pauseQuestion = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pause_question",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Question paused/resumed successfully:", result.message);
        await loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to pause/resume question");
      }
    } catch (err) {
      setError("Failed to pause/resume question");
    }
  };

  const endQuiz = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_quiz",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Quiz ended successfully:", result.message);
        await loadGameState(); // Refresh state
      } else {
        setError(result.error || "Failed to end quiz");
      }
    } catch (err) {
      setError("Failed to end quiz");
    }
  };

  const getQuestionResults = async () => {
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_question_results",
          gameId: selectedSession,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setQuestionResults(result.results);
      } else {
        setError(result.error || "Failed to get question results");
      }
    } catch (err) {
      setError("Failed to get question results");
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_question",
          gameId: selectedSession,
          questionData: { id: questionId },
        }),
      });

      const result = await response.json();
      if (result.success) {
        await loadQuestions(); // Refresh questions list
        setError("");
      } else {
        setError(result.error || "Failed to delete question");
      }
    } catch (err) {
      setError("Failed to delete question");
    }
  };

  // Load teams when modal opens
  React.useEffect(() => {
    if (showTeamsModal && selectedSession) {
      loadTeams();
    }
  }, [showTeamsModal, selectedSession]);

  // Load questions when quiz manager modal opens
  React.useEffect(() => {
    if (showQuizManager && selectedSession) {
      loadQuestions();
    }
  }, [showQuizManager, selectedSession]);

  // Reset answer reveal when question changes
  React.useEffect(() => {
    if (gameState?.currentQuestion?.id) {
      setShowAnswer(false);
    }
  }, [gameState?.currentQuestion?.id]);

  // Load available themes when quiz picker is opened
  React.useEffect(() => {
    console.log("HostPage - Quiz picker effect triggered, showQuizPicker:", showQuizPicker);
    if (showQuizPicker) {
      console.log("HostPage - Opening quiz picker, loading themes...");
      loadAvailableThemes();
    }
  }, [showQuizPicker]);

  // Sync activeTab with game state
  React.useEffect(() => {
    if (gameState && gameState.session) {
      setActiveTab(gameState.session.mode);
    }
  }, [gameState]);

  // Mode switching function
  const switchMode = async (newMode) => {
    if (!selectedSession || newMode === gameState?.session?.mode) return;

    try {
      console.log(`HostPage - Switching mode to: ${newMode}`);
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch_mode",
          gameId: selectedSession,
          newMode: newMode,
        }),
      });

      const result = await response.json();
      console.log("HostPage - Switch mode response:", result);
      
      if (result.success) {
        // Update UI immediately
        setActiveTab(newMode);
        setGameState((prev) => ({
          ...prev,
          session: { ...prev.session, mode: newMode },
        }));
        setError("");
        console.log(`HostPage - Mode switched to ${newMode} successfully`);
        
        // Reload game state to get updated mode from server
        await loadGameState();
      } else {
        console.error("HostPage - Failed to switch mode:", result.error);
        setError(result.error || "Failed to switch mode");
      }
    } catch (err) {
      console.error("HostPage - Error switching mode:", err);
      setError("Failed to switch mode");
    }
  };

  // Database Control Functions
  const clearAllSessions = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL game sessions and their data. This action cannot be undone. Are you sure?")) {
      return;
    }

    setIsClearingData(true);
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_all_sessions",
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("✅ All game sessions have been cleared successfully!");
        setShowDatabaseControl(false);
        // Reset local state
        setGameState(null);
        setSelectedSession("");
        localStorage.removeItem("selectedSession");
      } else {
        setError(result.error || "Failed to clear sessions");
      }
    } catch (err) {
      setError("Failed to clear sessions");
    } finally {
      setIsClearingData(false);
    }
  };

  const clearAllPlayers = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL player data. This action cannot be undone. Are you sure?")) {
      return;
    }

    setIsClearingData(true);
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_all_players",
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("✅ All player data has been cleared successfully!");
        setShowDatabaseControl(false);
        await loadGameState(); // Refresh current session
      } else {
        setError(result.error || "Failed to clear players");
      }
    } catch (err) {
      setError("Failed to clear players");
    } finally {
      setIsClearingData(false);
    }
  };

  const clearAllGameRecords = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL game events and records. This action cannot be undone. Are you sure?")) {
      return;
    }

    setIsClearingData(true);
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_all_game_records",
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("✅ All game records have been cleared successfully!");
        setShowDatabaseControl(false);
        await loadGameState(); // Refresh current session
      } else {
        setError(result.error || "Failed to clear game records");
      }
    } catch (err) {
      setError("Failed to clear game records");
    } finally {
      setIsClearingData(false);
    }
  };

  const clearAllTeams = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL teams. This action cannot be undone. Are you sure?")) {
      return;
    }

    setIsClearingData(true);
    try {
      const response = await fetch("/api/host-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_all_teams",
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("✅ All teams have been cleared successfully!");
        setShowDatabaseControl(false);
        await loadGameState(); // Refresh current session
      } else {
        setError(result.error || "Failed to clear teams");
      }
    } catch (err) {
      setError("Failed to clear teams");
    } finally {
      setIsClearingData(false);
    }
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
                  onClick={goHome}
                  className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Back to Home
                </button>
              </div>
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
          🎰 Loading Vegas Luck Bingo...
        </div>
      </div>
    );
  }

  // Show create session option if game not found
  if (!gameState && error.includes("not found")) {
    return (
      <div className="min-h-screen bg-[#1A0F2A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#FFD700] text-2xl font-bold mb-3">Preparing session...</div>
          <div className="text-white/70">Session {selectedSession} was just created or selected. Connecting...</div>
          <div className="text-white/50 text-sm mt-2">Error: {error}</div>
          <div className="mt-6">
            <button
              onClick={loadGameState}
              className="px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#0080FF] text-white font-bold rounded-lg hover:from-[#0080FF] hover:to-[#00BFFF] transition-all duration-300"
            >
              Retry now
            </button>
          </div>
        </div>
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
                onClick={() => setShowDatabaseControl(true)}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-[#FF4500] to-[#FF6347] text-white font-bold rounded-lg hover:from-[#FF6347] hover:to-[#FF4500] transition-all duration-300 text-xs sm:text-sm"
                title="Database Control Center"
              >
                <span className="hidden sm:inline">🗄️ DB Control</span>
                <span className="sm:hidden">🗄️ DB</span>
              </button>
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
                  {gameState.session.roundNumber}
                </div>
              </div>
              {gameState.session.previousRoundWinner && (
                <div className="text-center mt-2">
                  <div className="text-white/60 text-sm">PREVIOUS WINNER</div>
                  <div className="text-[#00FF00] text-xl font-bold">
                    {gameState.session.previousRoundWinner}
                  </div>
                </div>
              )}
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

              
              {/* Prize Status Display */}
              <div className="text-center">
                <div className="text-white/60 text-sm">PRIZE STATUS</div>
                <div className="flex gap-4 justify-center">
                  <div className={`text-sm font-bold ${gameState.session.linePrizeClaimed ? 'text-[#FFD700]' : 'text-gray-400'}`}>
                    📏 2nd Prize: {gameState.session.linePrizeClaimed ? 'CLAIMED' : 'AVAILABLE'}
                  </div>
                  <div className={`text-sm font-bold ${gameState.session.fullCardPrizeClaimed ? 'text-[#00FF00]' : 'text-gray-400'}`}>
                    🏆 1st Prize: {gameState.session.fullCardPrizeClaimed ? 'CLAIMED' : 'AVAILABLE'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="mt-4 bg-black/60 rounded-xl overflow-hidden">
            <div className="flex">
              <button
                onClick={() => switchMode("bingo")}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all duration-300 ${
                  activeTab === "bingo"
                    ? "bg-[#FFD700] text-black"
                    : "text-[#FFD700] hover:bg-[#FFD700]/20"
                }`}
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                🎲 BINGO
              </button>
              <button
                onClick={() => switchMode("trivia")}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all duration-300 ${
                  activeTab === "trivia"
                    ? "bg-[#00BFFF] text-white"
                    : "text-[#00BFFF] hover:bg-[#00BFFF]/20"
                }`}
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                🧠 TRIVIA
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
          {/* Main Control Panel */}
          <div className="xl:col-span-2 space-y-6">
            {activeTab === "bingo" ? (
              // BINGO TAB CONTENT
              <>
            {/* Current Round / Question Display */}
            <div
              className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-8"
              style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
            >
              {gameState.session.mode === "bingo" ? (
                <div>
                  <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                    {/* B I N G O sections (5 rows), each row spans 15 balls across full width with 4px gaps */}
                    <div className="grid grid-rows-5 gap-3">
                      {["B", "I", "N", "G", "O"].map((letter, rowIdx) => (
                        <div key={letter}>
                          <div className="text-center text-[#FFD700] font-bold mb-2">{letter}</div>
                          <div className="grid" style={{ gridTemplateColumns: "repeat(15, 1fr)", gap: 4 }}>
                            {Array.from({ length: 15 }, (_, i) => rowIdx * 15 + i + 1).map((num) => {
                              const isDrawn = gameState.session.drawnBalls.includes(num);
                              const isCurrent = gameState.session.currentBall === num;
                              return (
                                <div
                                  key={num}
                                  className={`w-full aspect-square flex items-center justify-center rounded-full text-[12px] font-bold border ${
                                    isCurrent
                                      ? "bg-[#FFD700] text-black border-[#FFD700]"
                                      : isDrawn
                                      ? "bg-white text-[#FFD700] border-[#FFD700]"
                                      : "bg-white/10 text-white/60 border-white/20"
                                  }`}
                                  style={{ boxShadow: isCurrent ? "0 0 10px #FFD700" : isDrawn ? "0 0 6px rgba(255,215,0,0.35)" : "none" }}
                                  title={`${getBallLetter(num)}-${num}`}
                                >
                                  {num}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-right text-white/60 text-xs">
                      {gameState.session.drawnBalls.length}/75 drawn
                    </div>
                  </div>
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
                className="group relative py-6 px-4 bg-gradient-to-br from-[#FF007F] to-[#DC143C] text-white rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl"
                style={{
                  boxShadow: "0 0 20px #FF007F",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <div className="text-3xl mb-2">⏹️</div>
                END ROUND
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
                onClick={goDisplay}
                className="group relative py-6 px-4 bg-gradient-to-br from-[#9400D3] to-[#8A2BE2] text-white rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl"
                style={{
                  boxShadow: "0 0 20px #9400D3",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <div className="text-3xl mb-2">📺</div>
                PUBLIC VIEW
              </button>

              <button
                onClick={() => setShowTeamsModal(true)}
                className="group relative py-6 px-4 bg-gradient-to-br from-[#00CED1] to-[#20B2AA] text-white rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl"
                style={{
                  boxShadow: "0 0 20px #00CED1",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <div className="text-3xl mb-2">👥</div>
                TEAMS
              </button>
            </div>
              </>
            ) : (
              // TRIVIA TAB CONTENT
              <>
                {/* Trivia Question Display */}
                <div
                  className="bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-8"
                  style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
                >
                  <h3
                    className="text-2xl font-bold text-[#00BFFF] mb-6 text-center"
                    style={{ textShadow: "0 0 5px #00BFFF" }}
                  >
                    🧠 TRIVIA CONTROL CENTER
                  </h3>

                  {gameState.currentQuestion ? (
                    <div className="space-y-4">
                      <div className="bg-black/40 rounded-xl p-6">
                        <h4 className="text-[#FFD700] font-bold text-xl mb-4">Current Question:</h4>
                        <p className="text-white text-lg mb-4">{gameState.currentQuestion.question}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {gameState.currentQuestion.answers.map((answer, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border-2 ${
                                showAnswer && index === gameState.currentQuestion.correctAnswer
                                  ? "bg-green-500/20 border-green-500 text-green-300"
                                  : showAnswer && index !== gameState.currentQuestion.correctAnswer
                                  ? "bg-red-500/20 border-red-500 text-red-300"
                                  : "bg-black/40 border-white/30 text-white"
                              }`}
                            >
                              <span className="font-bold">{String.fromCharCode(65 + index)}:</span> {answer}
                              {showAnswer && index === gameState.currentQuestion.correctAnswer && (
                                <span className="ml-2 text-green-400">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {showAnswer && (
                          <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded-lg">
                            <div className="text-green-300 font-bold">Correct Answer: {String.fromCharCode(65 + gameState.currentQuestion.correctAnswer)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/60 py-12">
                      <div className="text-6xl mb-4">❓</div>
                      <p className="text-xl">No active trivia question</p>
                      <p className="text-sm mt-2">Use the controls below to manage trivia questions</p>
                    </div>
                  )}
                </div>

                {/* Trivia Controls */}
                <div
                  className="bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-6"
                  style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
                >
                  <h3
                    className="text-xl font-bold text-[#00BFFF] mb-4"
                    style={{ textShadow: "0 0 5px #00BFFF" }}
                  >
                    🎮 TRIVIA CONTROLS
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <button
                      onClick={() => setShowQuizPicker(true)}
                      className="py-4 px-4 bg-gradient-to-br from-[#FF6B6B] to-[#FF4757] text-white rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl"
                      style={{
                        boxShadow: "0 0 20px #FF6B6B",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      PICK QUIZ
                    </button>

                    <button
                      onClick={() => setShowQuizManager(true)}
                      className="py-4 px-4 bg-gradient-to-br from-[#00BFFF] to-[#0080FF] text-white rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl"
                      style={{
                        boxShadow: "0 0 20px #00BFFF",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">📝</div>
                      QUESTIONS
                    </button>

                    <button
                      onClick={() => {
                        if (gameState.currentQuestion && gameState.session.currentQuestionStatus !== 'active') {
                          startQuestion(gameState.currentQuestion.id);
                        } else {
                          setError("No question selected or question already active");
                        }
                      }}
                      disabled={!gameState.currentQuestion || gameState.session.currentQuestionStatus === 'active'}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        !gameState.currentQuestion || gameState.session.currentQuestionStatus === 'active'
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#32CD32] to-[#00FF00] text-black hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: !gameState.currentQuestion || gameState.session.currentQuestionStatus === 'active' ? "none" : "0 0 20px #32CD32",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">▶️</div>
                      START Q
                    </button>

                    <button
                      onClick={endQuestion}
                      disabled={gameState.session.currentQuestionStatus !== 'active'}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        gameState.session.currentQuestionStatus !== 'active'
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#FF8C00] to-[#FF4500] text-white hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: gameState.session.currentQuestionStatus !== 'active' ? "none" : "0 0 20px #FF8C00",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">⏹️</div>
                      END Q
                    </button>

                    <button
                      onClick={() => setShowAnswer(true)}
                      disabled={gameState.session.currentQuestionStatus !== 'active' && gameState.session.currentQuestionStatus !== 'results'}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        gameState.session.currentQuestionStatus !== 'active' && gameState.session.currentQuestionStatus !== 'results'
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#FF1493] to-[#FF69B4] text-white hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: gameState.session.currentQuestionStatus !== 'active' && gameState.session.currentQuestionStatus !== 'results' ? "none" : "0 0 20px #FF1493",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">👁️</div>
                      REVEAL
                    </button>

                    <button
                      onClick={getQuestionResults}
                      disabled={gameState.session.currentQuestionStatus !== 'results'}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        gameState.session.currentQuestionStatus !== 'results'
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#9400D3] to-[#8A2BE2] text-white hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: gameState.session.currentQuestionStatus !== 'results' ? "none" : "0 0 20px #9400D3",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">🏆</div>
                      RESULTS
                    </button>

                    <button
                      onClick={nextQuestion}
                      disabled={gameState.session.currentQuestionStatus !== 'ended' && gameState.session.currentQuestionStatus !== 'results'}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        gameState.session.currentQuestionStatus !== 'ended' && gameState.session.currentQuestionStatus !== 'results'
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: gameState.session.currentQuestionStatus !== 'ended' && gameState.session.currentQuestionStatus !== 'results' ? "none" : "0 0 20px #FFD700",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">⏭️</div>
                      NEXT Q
                    </button>

                    <button
                      onClick={pauseQuestion}
                      disabled={gameState.session.currentQuestionStatus !== 'active' && gameState.session.currentQuestionStatus !== 'paused'}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        gameState.session.currentQuestionStatus !== 'active' && gameState.session.currentQuestionStatus !== 'paused'
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#FF69B4] to-[#FF1493] text-white hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: gameState.session.currentQuestionStatus !== 'active' && gameState.session.currentQuestionStatus !== 'paused' ? "none" : "0 0 20px #FF69B4",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">
                        {gameState.session.currentQuestionStatus === 'paused' ? '▶️' : '⏸️'}
                      </div>
                      {gameState.session.currentQuestionStatus === 'paused' ? 'RESUME' : 'PAUSE'}
                    </button>

                    <button
                      onClick={endQuiz}
                      disabled={!gameState.currentQuestion}
                      className={`py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        !gameState.currentQuestion
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#DC143C] to-[#8B0000] text-white hover:shadow-2xl"
                      }`}
                      style={{
                        boxShadow: !gameState.currentQuestion ? "none" : "0 0 20px #DC143C",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      <div className="text-2xl mb-2">⏹️</div>
                      END QUIZ
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Trivia Scoreboard */}
            {activeTab === "trivia" && (
              <div
                className="bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-6 mt-6"
                style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
              >
                <h3
                  className="text-2xl font-bold text-[#00BFFF] mb-6 text-center"
                  style={{ textShadow: "0 0 5px #00BFFF" }}
                >
                  🏆 TRIVIA SCOREBOARD
                </h3>

                {/* Individual Player Scores */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-[#FFD700] mb-3">👤 Individual Players</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {gameState.players
                      .sort((a, b) => (b.triviaPoints || 0) - (a.triviaPoints || 0))
                      .map((player, index) => (
                        <div
                          key={player.id}
                          className={`p-3 rounded-lg border-2 ${
                            index === 0 ? "bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border-[#FFD700]" :
                            index === 1 ? "bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300" :
                            index === 2 ? "bg-gradient-to-r from-[#CD7F32]/20 to-[#B8860B]/20 border-[#CD7F32]" :
                            "bg-black/40 border-white/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-bold">{player.nickname}</div>
                              {player.teamName && (
                                <div 
                                  className="text-sm"
                                  style={{ color: player.teamColor }}
                                >
                                  {player.teamName}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-bold ${
                                index === 0 ? "text-[#FFD700]" :
                                index === 1 ? "text-gray-300" :
                                index === 2 ? "text-[#CD7F32]" :
                                "text-[#00BFFF]"
                              }`}>
                                {player.triviaPoints || 0}
                              </div>
                              <div className="text-xs text-white/60">pts</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Team Scores (if teams exist) */}
                {gameState.players.some(p => p.teamName) && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-[#FFD700] mb-3">👥 Team Scores</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        const teamScores = {};
                        gameState.players.forEach(player => {
                          if (player.teamName) {
                            if (!teamScores[player.teamName]) {
                              teamScores[player.teamName] = {
                                name: player.teamName,
                                color: player.teamColor,
                                points: 0,
                                players: []
                              };
                            }
                            teamScores[player.teamName].points += player.triviaPoints || 0;
                            teamScores[player.teamName].players.push(player.nickname);
                          }
                        });
                        
                        return Object.values(teamScores)
                          .sort((a, b) => b.points - a.points)
                          .map((team, index) => (
                            <div
                              key={team.name}
                              className={`p-4 rounded-lg border-2 ${
                                index === 0 ? "bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border-[#FFD700]" :
                                index === 1 ? "bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300" :
                                "bg-black/40 border-white/30"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div 
                                    className="font-bold text-lg"
                                    style={{ color: team.color }}
                                  >
                                    {team.name}
                                  </div>
                                  <div className="text-white/60 text-sm">
                                    {team.players.join(', ')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${
                                    index === 0 ? "text-[#FFD700]" :
                                    index === 1 ? "text-gray-300" :
                                    "text-[#00BFFF]"
                                  }`}>
                                    {team.points}
                                  </div>
                                  <div className="text-xs text-white/60">pts</div>
                                </div>
                              </div>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Session Statistics */}
                <div>
                  <h4 className="text-lg font-bold text-[#FFD700] mb-3">📊 Session Stats</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-white/30">
                      <div className="text-white/60 text-sm">Total Players</div>
                      <div className="text-[#00BFFF] font-bold text-xl">{gameState.players.length}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/30">
                      <div className="text-white/60 text-sm">Total Points</div>
                      <div className="text-[#FFD700] font-bold text-xl">
                        {gameState.players.reduce((sum, p) => sum + (p.triviaPoints || 0), 0)}
                      </div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/30">
                      <div className="text-white/60 text-sm">Avg Points</div>
                      <div className="text-[#00BFFF] font-bold text-xl">
                        {gameState.players.length > 0 
                          ? Math.round(gameState.players.reduce((sum, p) => sum + (p.triviaPoints || 0), 0) / gameState.players.length)
                          : 0}
                      </div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/30">
                      <div className="text-white/60 text-sm">Round</div>
                      <div className="text-[#FFD700] font-bold text-xl">
                        {gameState.session.roundNumber} / {gameState.session.maxRounds}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                          Card hash: {(() => {
                            try {
                              const card = player.bingoCard || [];
                              let hash = 0;
                              for (let i = 0; i < card.length; i++) {
                                hash = (hash * 31 + (card[i] || 0)) >>> 0;
                              }
                              return hash.toString(16).padStart(8, '0');
                            } catch {
                              return 'n/a';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="text-white/60 text-sm">
                        🏆 {player.wins} wins
                        {player.teamName && (
                          <div 
                            className="text-sm font-bold mt-1"
                            style={{ color: player.teamColor }}
                          >
                            👥 {player.teamName}
                          </div>
                        )}
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
                      
                      {/* Different winner announcement buttons based on bingo mode */}
                      {gameState.session.bingoMode === 'manual' ? (
                        <>
                          <button
                            onClick={() => announceWinnerManual(player.id, 'line')}
                            disabled={gameState.session.linePrizeClaimed}
                            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                              gameState.session.linePrizeClaimed
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-[#FFD700] text-black hover:bg-[#FFA500]"
                            }`}
                            title={gameState.session.linePrizeClaimed ? "Line prize already claimed" : "Announce Line Winner"}
                          >
                            📏
                          </button>
                          <button
                            onClick={() => announceWinnerManual(player.id, 'full_card')}
                            disabled={gameState.session.fullCardPrizeClaimed}
                            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                              gameState.session.fullCardPrizeClaimed
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-[#00FF00] text-black hover:bg-[#32CD32]"
                            }`}
                            title={gameState.session.fullCardPrizeClaimed ? "Full card prize already claimed" : "Announce Full Card Winner"}
                          >
                            🏆
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => announceWinner(player.id)}
                          className="px-3 py-1 bg-[#00FF00] text-black rounded hover:bg-[#32CD32] transition-colors text-sm font-bold"
                          title="Announce Winner"
                        >
                          🏆
                        </button>
                      )}
                      
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

        {/* Previous Winners Display */}
        <div
          className="bg-black/80 backdrop-blur-sm border-2 border-[#00FF00] rounded-2xl p-6"
          style={{ boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)" }}
        >
          <h3
            className="text-2xl font-bold text-[#00FF00] mb-4"
            style={{ textShadow: "0 0 5px #00FF00" }}
          >
            🏆 PREVIOUS WINNERS
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {previousWinners.length > 0 ? (
              previousWinners.map((winner, index) => (
                <div
                  key={index}
                  className="bg-white/10 p-3 rounded-lg border border-[#00FF00]/30 hover:border-[#00FF00]/60 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#00FF00] font-bold text-lg">
                          🏆
                        </span>
                        <span className="text-white font-bold">
                          {winner.winner}
                        </span>
                        <span className="text-[#FFD700] text-sm font-bold">
                          Round {winner.round}
                        </span>
                        {winner.winType && winner.winType !== 'Unknown' && (
                          <span className={`text-xs font-bold ${
                            winner.winType === 'line' ? 'text-[#FFD700]' : 
                            winner.winType === 'full_card' ? 'text-[#00FF00]' : 
                            'text-[#00BFFF]'
                          }`}>
                            {winner.winType === 'line' ? '📏 2nd PRIZE' : 
                             winner.winType === 'full_card' ? '🏆 1st PRIZE' : 
                             winner.winType.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-white/60 text-sm mt-1">
                        Total Wins: {winner.totalWins} • {new Date(winner.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-white/60 py-8">
                <div className="text-4xl mb-2">🏆</div>
                <div>No winners yet</div>
                <div className="text-sm mt-1">Winners will appear here after rounds end</div>
              </div>
            )}
          </div>

          {/* Current Round Winner (if any) */}
          {gameState.session.winnerNickname && (
            <div className="mt-4 p-4 bg-gradient-to-r from-[#00FF00]/20 to-[#32CD32]/20 rounded-lg border-2 border-[#00FF00]">
              <div className="text-center">
                <div className="text-[#00FF00] text-lg font-bold mb-1">
                  🎉 CURRENT ROUND WINNER 🎉
                </div>
                <div className="text-white text-xl font-bold">
                  {gameState.session.winnerNickname}
                </div>
                <div className="text-white/60 text-sm mt-1">
                  Round {gameState.session.roundNumber}
                </div>
                {/* Show which prize was won if available */}
                {gameState.session.lineWinnerId && gameState.session.linePrizeClaimed && (
                  <div className="text-[#FFD700] text-sm font-bold mt-1">
                    📏 2nd Prize Winner
                  </div>
                )}
                {gameState.session.fullCardWinnerId && gameState.session.fullCardPrizeClaimed && (
                  <div className="text-[#00FF00] text-sm font-bold mt-1">
                    🏆 1st Prize Winner
                  </div>
                )}
              </div>
            </div>
          )}
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
                const col = Math.floor(index / 5); // Correct: col-major indexing
                const row = index % 5;            // Correct: col-major indexing
                const isMarked = showPlayerCard.markedCells.includes(index);
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
                        src="/LogoT.png"
                        alt="Free Space"
                        className="w-full h-full object-fill rounded-md"
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

      {/* Quiz Manager Modal */}
      {showQuizManager && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#00BFFF] max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 0 30px #00BFFF" }}
          >
            <div className="text-center mb-6">
              <h3
                className="text-3xl font-bold text-[#00BFFF] mb-2"
                style={{ textShadow: "0 0 10px #00BFFF" }}
              >
                🧠 QUIZ MANAGER
              </h3>
              <p className="text-white/80">Create and manage trivia questions for your session</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 text-center">
                {error}
              </div>
            )}

            {/* Create/Edit Question Form */}
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <h4 className="text-[#FFD700] font-bold text-xl mb-4">
                {editingQuestion ? "Edit Question" : "Create New Question"}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-white/80 font-bold mb-2">Question:</label>
                  <textarea
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    placeholder="Enter your trivia question..."
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white focus:border-[#00BFFF] focus:outline-none transition-colors duration-300"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-bold mb-2">Time Limit (seconds):</label>
                  <input
                    type="number"
                    value={newQuestion.timeLimit}
                    onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: parseInt(e.target.value) || 15 })}
                    min="5"
                    max="60"
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white focus:border-[#00BFFF] focus:outline-none transition-colors duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-white/80 font-bold mb-2">Category:</label>
                  <select
                    value={newQuestion.category || "general"}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white focus:border-[#00BFFF] focus:outline-none transition-colors duration-300"
                  >
                    <option value="general">General</option>
                    <option value="science">Science</option>
                    <option value="history">History</option>
                    <option value="geography">Geography</option>
                    <option value="sports">Sports</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="math">Math</option>
                    <option value="literature">Literature</option>
                    <option value="art">Art</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 font-bold mb-2">Difficulty:</label>
                  <select
                    value={newQuestion.difficulty || "medium"}
                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white focus:border-[#00BFFF] focus:outline-none transition-colors duration-300"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-white/80 font-bold mb-2">Answer Options:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newQuestion.answers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={newQuestion.correctAnswer === index}
                        onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: index })}
                        className="w-5 h-5 text-[#00BFFF] bg-black/50 border-[#00BFFF] focus:ring-[#00BFFF]"
                      />
                      <input
                        type="text"
                        value={answer}
                        onChange={(e) => {
                          const newAnswers = [...newQuestion.answers];
                          newAnswers[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, answers: newAnswers });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="flex-1 px-4 py-3 bg-black/50 border-2 border-[#00BFFF]/50 rounded-lg text-white focus:border-[#00BFFF] focus:outline-none transition-colors duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={saveQuestion}
                  className="flex-1 py-3 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300"
                >
                  {editingQuestion ? "✅ Update Question" : "✅ Save Question"}
                </button>
                {editingQuestion && (
                  <button
                    onClick={() => {
                      setEditingQuestion(null);
                      setNewQuestion({
                        question: "",
                        answers: ["", "", "", ""],
                        correctAnswer: 0,
                        timeLimit: 15,
                        category: "general",
                        difficulty: "medium",
                        mediaUrl: null,
                      });
                    }}
                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all duration-300"
                  >
                    ❌ Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[#FFD700] font-bold text-xl">Existing Questions ({questions.length})</h4>
                <button
                  onClick={loadQuestions}
                  className="px-4 py-2 bg-[#00BFFF] text-white font-bold rounded-lg hover:bg-[#0080FF] transition-all duration-300"
                >
                  🔄 Refresh
                </button>
              </div>
              
              {questions.length === 0 ? (
                <div className="text-center text-white/60 py-8">
                  No questions created yet. Create your first question above!
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className="bg-black/60 rounded-lg p-4 border-2 border-[#00BFFF]/30"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h5 className="text-white font-bold text-lg mb-2">{question.question}</h5>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {question.answers.map((answer, index) => (
                              <div
                                key={index}
                                className={`p-2 rounded border ${
                                  index === question.correct_answer
                                    ? "bg-green-500/20 border-green-500 text-green-300"
                                    : "bg-black/40 border-white/30 text-white"
                                }`}
                              >
                                <span className="font-bold">{String.fromCharCode(65 + index)}:</span> {answer}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-4 text-sm text-white/60">
                            <span>⏱️ {question.time_limit}s</span>
                            <span>📚 {question.category}</span>
                            <span>🎯 {question.difficulty}</span>
                            <span>🏆 {question.points} pts</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingQuestion(question);
                              setNewQuestion({
                                question: question.question,
                                answers: question.answers,
                                correctAnswer: question.correct_answer,
                                timeLimit: question.time_limit,
                                category: question.category || "general",
                                difficulty: question.difficulty || "medium",
                                mediaUrl: question.media_url,
                              });
                            }}
                            className="px-3 py-1 bg-[#FFD700] text-black font-bold rounded hover:bg-[#FFA500] transition-colors text-sm"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => startQuestion(question.id)}
                            disabled={gameState?.session?.currentQuestionStatus === 'active'}
                            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                              gameState?.session?.currentQuestionStatus === 'active'
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-[#00FF00] text-black hover:bg-[#32CD32]"
                            }`}
                          >
                            ▶️ Start
                          </button>
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            className="px-3 py-1 bg-[#FF007F] text-white font-bold rounded hover:bg-[#DC143C] transition-colors text-sm"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowQuizManager(false);
                setEditingQuestion(null);
                setNewQuestion({
                  question: "",
                  answers: ["", "", "", ""],
                  correctAnswer: 0,
                  timeLimit: 15,
                  category: "general",
                  difficulty: "medium",
                  mediaUrl: null,
                });
                setError("");
              }}
              className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Quiz Picker Modal */}
      {showQuizPicker && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#FF6B6B] max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 0 30px #FF6B6B" }}
          >
            <div className="text-center mb-6">
              <h3
                className="text-3xl font-bold text-[#FF6B6B] mb-2"
                style={{ textShadow: "0 0 10px #FF6B6B" }}
              >
                🎯 THEME QUIZ PICKER
              </h3>
              <p className="text-white/80">Select a themed quiz with 20 questions to start</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 text-center">
                {error}
              </div>
            )}

            {/* Filters */}
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <h4 className="text-[#FFD700] font-bold text-xl mb-4">Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/80 font-bold mb-2">Category:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#FF6B6B]/50 rounded-lg text-white focus:border-[#FF6B6B] focus:outline-none transition-colors duration-300"
                  >
                                      <option value="all">All Categories</option>
                  {themeCategories.map(category => (
                    <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
                  ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 font-bold mb-2">Difficulty:</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#FF6B6B]/50 rounded-lg text-white focus:border-[#FF6B6B] focus:outline-none transition-colors duration-300"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="text-white/80 text-sm">
                    Showing: {availableThemes.filter(t => 
                      (selectedCategory === 'all' || t.category === selectedCategory) &&
                      (selectedDifficulty === 'all' || t.difficulty === selectedDifficulty)
                    ).length} themes
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz List */}
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <h4 className="text-[#FFD700] font-bold text-xl mb-4">
                Available Themes ({availableThemes.filter(t => 
                  (selectedCategory === 'all' || t.category === selectedCategory) &&
                  (selectedDifficulty === 'all' || t.difficulty === selectedDifficulty)
                ).length})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {availableThemes
                  .filter(t => 
                    (selectedCategory === 'all' || t.category === selectedCategory) &&
                    (selectedDifficulty === 'all' || t.difficulty === selectedDifficulty)
                  )
                  .map((theme) => (
                    <div
                      key={theme.id}
                      className="bg-black/60 rounded-xl p-6 border-2 border-[#FF6B6B]/30 hover:border-[#FF6B6B] transition-all duration-300 cursor-pointer"
                      onClick={() => selectAndStartTheme(theme)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs px-3 py-1 rounded-full text-white font-bold"
                          style={{
                            backgroundColor: 
                              theme.difficulty === 'easy' ? '#32CD32' :
                              theme.difficulty === 'medium' ? '#FFD700' : '#FF4500'
                          }}
                        >
                          {theme.difficulty.toUpperCase()}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full bg-[#00BFFF] text-white font-bold">
                          {theme.category.toUpperCase()}
                        </span>
                      </div>
                      
                      <h5 className="text-white font-bold text-lg mb-3">
                        {theme.name}
                      </h5>
                      
                      <p className="text-white/70 text-sm mb-4 line-clamp-3">
                        {theme.description}
                      </p>
                      
                      <div className="text-white/60 text-sm mb-4">
                        <div className="flex justify-between items-center">
                          <span>📝 {theme.actual_questions} questions</span>
                          <span>⏱️ 30s each (Global)</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span>🏆 {theme.points_per_question} points per question</span>
                          <span>🎯 Total: {theme.actual_questions * theme.points_per_question} points</span>
                        </div>
                      </div>
                      
                      <button
                        className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF4757] text-white font-bold rounded-lg hover:from-[#FF4757] hover:to-[#FF6B6B] transition-all duration-300"
                      >
                        🎯 Start Theme Quiz
                      </button>
                    </div>
                  ))}
              </div>
              
              {availableThemes.filter(t => 
                (selectedCategory === 'all' || t.category === selectedCategory) &&
                (selectedDifficulty === 'all' || t.difficulty === selectedDifficulty)
              ).length === 0 && (
                <div className="text-center text-white/60 py-8">
                  <div className="text-4xl mb-4">🎯</div>
                  <div>No themes found with the selected filters</div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowQuizPicker(false);
                setSelectedTheme(null);
                setSelectedCategory('all');
                setSelectedDifficulty('all');
                setError("");
              }}
              className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Teams Management Modal */}
      {showTeamsModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-8 rounded-2xl border-4 border-[#00CED1] max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 0 30px #00CED1" }}
          >
            <div className="text-center mb-6">
              <h3
                className="text-3xl font-bold text-[#00CED1] mb-2"
                style={{ textShadow: "0 0 10px #00CED1" }}
              >
                👥 TEAMS MANAGEMENT
              </h3>
              <p className="text-white/80">Create and manage teams for your session</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 text-center">
                {error}
              </div>
            )}

            {/* Create New Team */}
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <h4 className="text-[#FFD700] font-bold text-xl mb-4">Create New Team</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-white/80 font-bold mb-2">Team Name:</label>
                  <input
                    type="text"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Enter team name"
                    className="w-full px-4 py-3 bg-black/50 border-2 border-[#00CED1]/50 rounded-lg text-white focus:border-[#00CED1] focus:outline-none transition-colors duration-300"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-bold mb-2">Team Color:</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newTeam.color}
                      onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                      className="w-16 h-12 rounded-lg border-2 border-[#00CED1]/50"
                    />
                    <input
                      type="text"
                      value={newTeam.color}
                      onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                      placeholder="#FFD700"
                      className="flex-1 px-4 py-3 bg-black/50 border-2 border-[#00CED1]/50 rounded-lg text-white focus:border-[#00CED1] focus:outline-none transition-colors duration-300"
                      maxLength={7}
                    />
                  </div>
                </div>
                <button
                  onClick={createTeam}
                  className="py-3 px-6 bg-gradient-to-r from-[#00FF00] to-[#32CD32] text-black font-bold rounded-lg hover:from-[#32CD32] hover:to-[#00FF00] transition-all duration-300"
                >
                  ✅ Create Team
                </button>
              </div>
            </div>

            {/* Teams List */}
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <h4 className="text-[#FFD700] font-bold text-xl mb-4">Existing Teams ({teams.length})</h4>
              
              {teams.length === 0 ? (
                <div className="text-center text-white/60 py-8">
                  No teams created yet. Create your first team above!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="bg-black/60 rounded-lg p-4 border-2"
                      style={{ borderColor: team.color }}
                    >
                      {editingTeam && editingTeam.id === team.id ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              value={editingTeam.name}
                              onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                              className="w-full px-3 py-2 bg-black/50 border border-white/30 rounded text-white focus:border-[#00CED1] focus:outline-none"
                              maxLength={30}
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editingTeam.color}
                              onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
                              className="w-12 h-8 rounded border"
                            />
                            <input
                              type="text"
                              value={editingTeam.color}
                              onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
                              className="flex-1 px-3 py-2 bg-black/50 border border-white/30 rounded text-white focus:border-[#00CED1] focus:outline-none"
                              maxLength={7}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={updateTeam}
                              className="flex-1 py-2 bg-[#00FF00] text-black font-bold rounded hover:bg-[#32CD32] transition-colors"
                            >
                              ✅ Save
                            </button>
                            <button
                              onClick={() => setEditingTeam(null)}
                              className="flex-1 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700 transition-colors"
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h5 
                              className="font-bold text-xl" 
                              style={{ color: team.color, textShadow: `0 0 5px ${team.color}` }}
                            >
                              {team.name}
                            </h5>
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white/30"
                              style={{ backgroundColor: team.color }}
                            ></div>
                          </div>
                          <div className="text-white/60 text-sm mb-3">
                            👥 {team.playerCount} players
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingTeam({ ...team })}
                              className="flex-1 py-2 bg-[#FFD700] text-black font-bold rounded hover:bg-[#FFA500] transition-colors text-sm"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteTeam(team.id, team.name)}
                              className="flex-1 py-2 bg-[#FF007F] text-white font-bold rounded hover:bg-[#DC143C] transition-colors text-sm"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowTeamsModal(false);
                setEditingTeam(null);
                setNewTeam({ name: "", color: "#FFD700" });
                setError("");
              }}
              className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Database Control Center Modal */}
      {showDatabaseControl && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={(e) => {
            // Close modal when clicking outside (but not on mobile to prevent accidental closes)
            if (e.target === e.currentTarget && window.innerWidth > 768) {
              setShowDatabaseControl(false);
              setError("");
            }
          }}
        >
          <div
            className="bg-gradient-to-br from-[#1A0F2A] to-[#2D1B3D] p-4 sm:p-8 rounded-2xl border-4 border-[#FF4500] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 0 30px #FF4500" }}
          >
            {/* Header with Exit Button */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1"></div>
              <div className="text-center flex-1">
                <h3
                  className="text-2xl sm:text-3xl font-bold text-[#FF4500] mb-2"
                  style={{ textShadow: "0 0 10px #FF4500" }}
                >
                  🗄️ DATABASE CONTROL
                </h3>
                <p className="text-white/80 text-sm sm:text-base">⚠️ WARNING: These actions are irreversible!</p>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowDatabaseControl(false);
                    setError("");
                  }}
                  disabled={isClearingData}
                  className={`p-2 sm:p-3 rounded-lg font-bold transition-all duration-300 ${
                    isClearingData
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900 transform hover:scale-110"
                  }`}
                  title="Close Database Control"
                >
                  <span className="text-xl sm:text-2xl">✕</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-300 text-center">
                {error}
              </div>
            )}

            {/* Mobile Warning Banner */}
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 sm:hidden">
              <div className="text-red-300 text-xs font-bold text-center">
                ⚠️ MOBILE MODE: Use with caution - these actions are permanent!
              </div>
            </div>

            {/* Scroll Indicator for Mobile */}
            <div className="text-center mb-4 sm:hidden">
              <div className="text-white/50 text-xs">📱 Scroll to see all options</div>
              <div className="w-8 h-1 bg-white/30 rounded-full mx-auto mt-2"></div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Clear All Sessions */}
              <div className="bg-black/40 rounded-xl p-4 sm:p-6 border-2 border-red-500/30">
                <h4 className="text-red-400 font-bold text-lg sm:text-xl mb-2 sm:mb-3">🗑️ Clear All Game Sessions</h4>
                <p className="text-white/70 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  This will delete ALL game sessions, including current session data, drawn balls, 
                  round information, and session history. Players will be disconnected.
                </p>
                <button
                  onClick={clearAllSessions}
                  disabled={isClearingData}
                  className={`w-full py-3 sm:py-3 px-4 sm:px-6 rounded-lg font-bold transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
                    isClearingData
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900 transform hover:scale-105 active:scale-95"
                  }`}
                >
                  {isClearingData ? "🔄 Clearing..." : "🗑️ Clear All Sessions"}
                </button>
              </div>

              {/* Clear All Players */}
              <div className="bg-black/40 rounded-xl p-4 sm:p-6 border-2 border-orange-500/30">
                <h4 className="text-orange-400 font-bold text-lg sm:text-xl mb-2 sm:mb-3">👥 Clear All Player Data</h4>
                <p className="text-white/70 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  This will delete ALL player accounts, including their bingo cards, wins, 
                  trivia points, and team assignments. Players will need to rejoin.
                </p>
                <button
                  onClick={clearAllPlayers}
                  disabled={isClearingData}
                  className={`w-full py-3 sm:py-3 px-4 sm:px-6 rounded-lg font-bold transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
                    isClearingData
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-600 to-orange-800 text-white hover:from-orange-700 hover:to-orange-900 transform hover:scale-105 active:scale-95"
                  }`}
                >
                  {isClearingData ? "🔄 Clearing..." : "👥 Clear All Players"}
                </button>
              </div>

              {/* Clear All Game Records */}
              <div className="bg-black/40 rounded-xl p-4 sm:p-6 border-2 border-yellow-500/30">
                <h4 className="text-yellow-400 font-bold text-lg sm:text-xl mb-2 sm:mb-3">📊 Clear All Game Records</h4>
                <p className="text-white/70 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  This will delete ALL game events, winner history, round records, 
                  and trivia question responses. Game history will be lost.
                </p>
                <button
                  onClick={clearAllGameRecords}
                  disabled={isClearingData}
                  className={`w-full py-3 sm:py-3 px-4 sm:px-6 rounded-lg font-bold transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
                    isClearingData
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-yellow-600 to-yellow-800 text-white hover:from-yellow-700 hover:to-yellow-900 transform hover:scale-105 active:scale-95"
                  }`}
                >
                  {isClearingData ? "🔄 Clearing..." : "📊 Clear All Game Records"}
                </button>
              </div>

              {/* Clear All Teams */}
              <div className="bg-black/40 rounded-xl p-4 sm:p-6 border-2 border-blue-500/30">
                <h4 className="text-blue-400 font-bold text-lg sm:text-xl mb-2 sm:mb-3">👥 Clear All Teams</h4>
                <p className="text-white/70 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  This will delete ALL teams and their configurations. Players will become unassigned 
                  and need to be reassigned to new teams.
                </p>
                <button
                  onClick={clearAllTeams}
                  disabled={isClearingData}
                  className={`w-full py-3 sm:py-3 px-4 sm:px-6 rounded-lg font-bold transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
                    isClearingData
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 transform hover:scale-105 active:scale-95"
                  }`}
                >
                  {isClearingData ? "🔄 Clearing..." : "👥 Clear All Teams"}
                </button>
              </div>
            </div>

            {/* Bottom Spacing for Mobile */}
            <div className="h-4 sm:h-6"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostPage;