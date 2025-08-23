import React from "react";
import { useNavigate, useParams } from "react-router-dom";

function PlayerPage() {
  const navigate = useNavigate();
  const [gameState, setGameState] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [player, setPlayer] = React.useState(null);
  const [selectedSession, setSelectedSession] = React.useState(null); // Changed default to null
  const [showJoinForm, setShowJoinForm] = React.useState(false);
  const [joinForm, setJoinForm] = React.useState({
    nickname: "",
    sessionId: "VB-2025",
    password: "",
    teamId: "",
  });
  const [availableTeams, setAvailableTeams] = React.useState([]);
  const [selectedAnswer, setSelectedAnswer] = React.useState(null);
  const [answerLocked, setAnswerLocked] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [questionTimer, setQuestionTimer] = React.useState(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [lastDrawnBall, setLastDrawnBall] = React.useState(null);
  const [highlightActive, setHighlightActive] = React.useState(false);
  const highlightTimerRef = React.useRef(null);
  const [recentDraws, setRecentDraws] = React.useState([]);
  const [highlightedPattern, setHighlightedPattern] = React.useState(null);
  const playerRef = React.useRef(null); // Add ref to track player state

  // Update ref whenever player state changes
  React.useEffect(() => {
    playerRef.current = player;
  }, [player]);

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

  // Reset selected answer when question changes
  React.useEffect(() => {
    if (gameState?.currentQuestion?.id) {
      setSelectedAnswer(null);
      setAnswerLocked(false); // Reset lock when new question starts
    }
  }, [gameState?.currentQuestion?.id]);

  // Simple synthesized "pencil" sound using Web Audio API
  const playPencilSound = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(700, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.14);
      setTimeout(() => ctx.close(), 300);
    } catch {}
  }, []);

  // Bell sound logic based on game mode and prize status
  const playBellSound = React.useCallback((winType, gameMode, linePrizeClaimed, fullCardPrizeClaimed) => {
    // Manual mode: No automatic bell sounds
    if (gameMode === 'manual') {
      return;
    }
    
    // Standard mode logic
    if (gameMode === 'standard') {
      // Only play bell for full card wins (1st prize)
      if (winType === 'full_card' && !fullCardPrizeClaimed) {
        const audio = new Audio('/bellsound.mp3');
        audio.play().catch(e => console.error("Error playing bell sound:", e));
      }
      // Don't play bell for line wins (2nd prize) - disabled after 2nd prize is claimed
    }
  }, []);

  const selectAnswer = (answerIndex) => {
    if (timeRemaining <= 0 || answerLocked) {
      return; // Prevent selection if time is up or answer is locked
    }
    setSelectedAnswer(answerIndex);
  };

  const lockInAnswer = async () => {
    if (!player || !gameState?.currentQuestion || selectedAnswer === null || timeRemaining <= 0) {
      return;
    }

    try {
      const response = await fetch("/api/player-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          gameId: gameState.session.gameId,
          playerId: player.id,
          questionId: gameState.currentQuestion.id,
          answerIndex: selectedAnswer,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Answer locked in successfully:", result);
        // Mark answer as locked in - player cannot change it
        setAnswerLocked(true);
        setError(null);
      } else {
        console.error("Failed to lock in answer:", result.error);
        setError(result.error || "Failed to lock in answer");
        // Reset selection if submission failed
        setSelectedAnswer(null);
      }
    } catch (err) {
      console.error("Error locking in answer:", err);
      setError("Failed to lock in answer");
      setSelectedAnswer(null);
    }
  };

  const leaveGame = () => {
    const allSessionsRaw = localStorage.getItem("bingoSessions");
    if (allSessionsRaw) {
      const allSessions = JSON.parse(allSessionsRaw);
      
      // Clean up player-specific data
      if (player && selectedSession) {
        const playerSpecificKey = `session_${selectedSession}_player_${player.nickname}`;
        if (allSessions[playerSpecificKey]) {
          delete allSessions[playerSpecificKey];
          localStorage.setItem("bingoSessions", JSON.stringify(allSessions));
          console.log("PlayerPage leaveGame - Removed player-specific data for:", playerSpecificKey);
        }
      }
      
      // Always try to clear the old single-player key for robustness
      localStorage.removeItem("bingoPlayer");
    }
    setPlayer(null);
    setGameState(null);
    setSelectedSession(null); // Reset to default/initial state to trigger fresh join form
    setJoinForm({ nickname: "", sessionId: "" }); // Reset join form completely, allow any input
    setShowJoinForm(true); // Always show join form after leaving
    // navigate('/'); // REMOVED: No longer navigate to home page
  };

  const { sessionId, playerName } = useParams();

  // Load game state and player data on mount and set up polling
  React.useEffect(() => {
    const targetSessionId = (sessionId || "").trim().toUpperCase(); // Normalize URL param
    const targetPlayerName = (playerName || "").trim(); // Get player name from URL
    let storedPlayer = null;
    let initialSelectedSession = null; // Changed default to null

    console.log("PlayerPage useEffect - URL sessionId:", sessionId, "playerName:", playerName, "Target sessionId (normalized):", targetSessionId);

    try {
      const allSessionsRaw = localStorage.getItem("bingoSessions");
      const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};

      // Create player-specific key for localStorage
      const playerSpecificKey = targetSessionId && targetPlayerName ? `session_${targetSessionId}_player_${targetPlayerName}` : null;
      console.log("PlayerPage useEffect - Player-specific key:", playerSpecificKey);

      if (targetSessionId && targetPlayerName) {
        // Check if this specific player exists in localStorage
        if (allSessions[playerSpecificKey]) {
          // If this specific player exists in local storage, use their data
          storedPlayer = allSessions[playerSpecificKey];
          initialSelectedSession = targetSessionId;
          setShowJoinForm(false);
          console.log("PlayerPage useEffect - Found specific player in localStorage. Player:", targetPlayerName, "Session:", initialSelectedSession);
        } else {
          // If URL has session and player but they're NOT in local storage, prompt to join
          setShowJoinForm(true);
          setJoinForm(prev => ({
            ...prev,
            sessionId: targetSessionId, // Pre-fill with URL sessionId
            nickname: targetPlayerName, // Pre-fill with URL playerName
          }));
          initialSelectedSession = targetSessionId;
          console.log("PlayerPage useEffect - Specific player not in localStorage. Prompting join for:", targetPlayerName, "in session:", initialSelectedSession);
        }
      } else if (targetSessionId && !targetPlayerName) {
        // If only sessionId in URL, check for any player in that session
        const sessionPlayers = Object.keys(allSessions).filter(key => key.startsWith(`session_${targetSessionId}_player_`));
        if (sessionPlayers.length > 0) {
          // Use the first player found in this session
          const firstPlayerKey = sessionPlayers[0];
          storedPlayer = allSessions[firstPlayerKey];
          initialSelectedSession = targetSessionId;
          setShowJoinForm(false);
          console.log("PlayerPage useEffect - Found existing player in session. Using:", firstPlayerKey, "Session:", initialSelectedSession);
        } else {
          // Session exists but no players, show join form
          setShowJoinForm(true);
          setJoinForm(prev => ({
            ...prev,
            sessionId: targetSessionId,
            nickname: "",
          }));
          initialSelectedSession = targetSessionId;
          console.log("PlayerPage useEffect - Session exists but no players. Prompting join for session:", initialSelectedSession);
        }
      } else if (!targetSessionId && Object.keys(allSessions).length > 0) {
        // If no sessionId in URL, but sessions exist in local storage, use the first one found
        const firstSessionKey = Object.keys(allSessions)[0];
        storedPlayer = allSessions[firstSessionKey];
        // Extract sessionId from the key (format: session_1_player_jobe)
        const sessionMatch = firstSessionKey.match(/session_(\w+)_player_/);
        initialSelectedSession = sessionMatch ? sessionMatch[1] : null;
        setShowJoinForm(false);
        console.log("PlayerPage useEffect - No URL session, found in localStorage. Using:", firstSessionKey, "Session:", initialSelectedSession);
      } else {
        // No sessionId in URL and no sessions in local storage, show join form with empty sessionId to allow input
        setShowJoinForm(true);
        setJoinForm(prev => ({ ...prev, sessionId: "", nickname: "" }));
        initialSelectedSession = null; // No session selected initially
        console.log("PlayerPage useEffect - No sessions found. Setting sessionId to empty.");
      }

      if (storedPlayer) {
        const normalized = Array.isArray(storedPlayer.markedCells)
          ? storedPlayer.markedCells
              .filter((c) => c !== "BINGO")
              .map((c) => parseInt(c))
              .filter((n) => Number.isFinite(n))
          : [];
        setPlayer({ ...storedPlayer, markedCells: normalized });
      } else {
        // If no storedPlayer found, ensure player state is null and join form is shown
        setPlayer(null);
        setShowJoinForm(true);
        // Ensure joinForm.sessionId is correctly set to targetSessionId if it exists, otherwise empty
        setJoinForm(prev => ({ 
          ...prev, 
          sessionId: targetSessionId || "",
          nickname: targetPlayerName || ""
        }));
        console.log("PlayerPage useEffect - No stored player found. Showing join form and setting sessionId:", targetSessionId || "", "nickname:", targetPlayerName || "");
      }

      setSelectedSession(initialSelectedSession); // Set selectedSession state consistently
      console.log("PlayerPage useEffect - Set selectedSession to:", initialSelectedSession);
    } catch (e) {
      console.error("PlayerPage useEffect - Error loading session from localStorage:", e);
      setShowJoinForm(true); // Fallback: always show join form on localStorage error
      setSelectedSession(null); // Clear selected session on error
      setPlayer(null); // Ensure player state is cleared on error
      // Ensure joinForm.sessionId is correctly set on error as well
      setJoinForm(prev => ({ 
        ...prev, 
        sessionId: targetSessionId || "",
        nickname: targetPlayerName || ""
      }));
    }

    // Start polling game state only if a session is selected and not null/empty
    if (initialSelectedSession) { // Check for truthiness, e.g., not null or empty string
      console.log("PlayerPage useEffect - initialSelectedSession is present, calling loadGameState.", initialSelectedSession);
      // Use initialSelectedSession directly instead of waiting for state update
      loadGameStateWithSession(initialSelectedSession);
      const interval = setInterval(() => loadGameStateWithSession(initialSelectedSession), 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    } else {
      console.log("PlayerPage useEffect - initialSelectedSession is NOT present. Setting loading to FALSE.");
      setLoading(false); // Ensure loading is false if no session is selected
    }
    // If no session to load, just clear interval if any
    return () => {};
  }, [sessionId, playerName]); // Depend only on URL params

  const loadGameStateWithSession = React.useCallback(async (sessionIdToUse) => {
    console.log("loadGameStateWithSession called. sessionIdToUse:", sessionIdToUse);
    if (!sessionIdToUse) {
      console.log("loadGameStateWithSession: sessionIdToUse is null/empty, returning.");
      setLoading(false); // Ensure loading is false if selectedSession is null/empty and loadGameState returns early
      return;
    }
    try {
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gameId: sessionIdToUse,
          playerId: playerRef.current?.id // Pass playerId to get updated player data
        }),
      });
      const result = await response.json();
      console.log("loadGameStateWithSession API response:", result);
      if (result.success) {
        setGameState(result);
        setError("");
        
        // Check if round number has changed (indicating a new round started)
        const roundChanged = gameState && gameState.session && 
                           gameState.session.roundNumber !== result.session.roundNumber;
        
        if (roundChanged) {
          console.log("loadGameStateWithSession - Round changed from", gameState.session.roundNumber, "to", result.session.roundNumber);
          console.log("loadGameStateWithSession - Forcing complete player data refresh for new round");
        }
        
        // Check for round_ended events in recent events
        const roundEndedEvent = result.recentEvents && result.recentEvents.find(event => 
          event.type === 'round_ended' && 
          event.data && 
          event.data.newRoundNumber === result.session.roundNumber
        );
        
        if (roundEndedEvent) {
          console.log("loadGameStateWithSession - Round ended event detected, ensuring fresh player data");
          // Force an immediate additional poll to get fresh data
          setTimeout(() => {
            console.log("loadGameStateWithSession - Triggering immediate refresh after round end");
            loadGameStateWithSession(sessionIdToUse);
          }, 500); // Poll again after 500ms to ensure we get the updated data
        }
        
        // Update player's marked cells and bingo card from server state if player exists
        if (playerRef.current && result.player) {
          const serverMarkedCells = Array.isArray(result.player.markedCells)
            ? result.player.markedCells
                .filter((c) => c !== "BINGO" && c !== "LINE_WIN" && c !== "FULL_CARD_WIN")
                .map((c) => parseInt(c))
                .filter((n) => Number.isFinite(n))
            : [];
          
          // Force complete refresh if round changed or round ended event detected
          const forceRefresh = roundChanged || roundEndedEvent;
          
          // Update local player state with server data - force complete refresh
          const updatedPlayer = { 
            ...playerRef.current, 
            markedCells: serverMarkedCells,
            bingoCard: result.player.bingoCard || playerRef.current.bingoCard
          };
          
          // If forcing refresh, ensure we use server data completely
          if (forceRefresh) {
            console.log("loadGameStateWithSession - FORCE REFRESH: Using complete server data");
            console.log("loadGameStateWithSession - Old marked cells:", playerRef.current.markedCells);
            console.log("loadGameStateWithSession - New marked cells:", serverMarkedCells);
            console.log("loadGameStateWithSession - Old bingo card:", playerRef.current.bingoCard);
            console.log("loadGameStateWithSession - New bingo card:", result.player.bingoCard);
          }
          
          setPlayer(updatedPlayer);
          
          // Update localStorage with server data
          const allSessionsRaw = localStorage.getItem("bingoSessions");
          if (allSessionsRaw) {
            const allSessions = JSON.parse(allSessionsRaw);
            const playerSpecificKey = `session_${sessionIdToUse}_player_${playerRef.current.nickname}`;
            if (allSessions[playerSpecificKey]) {
              allSessions[playerSpecificKey] = updatedPlayer;
              localStorage.setItem("bingoSessions", JSON.stringify(allSessions));
              console.log("loadGameStateWithSession - Updated player data from server:", updatedPlayer);
              console.log("loadGameStateWithSession - Marked cells reset to:", serverMarkedCells);
              console.log("loadGameStateWithSession - New bingo card:", result.player.bingoCard);
              
              if (roundChanged) {
                console.log("loadGameStateWithSession - Round change detected: Player data refreshed for new round");
              }
              
              if (roundEndedEvent) {
                console.log("loadGameStateWithSession - Round ended event detected: Player data refreshed");
              }
            }
          }
        }
        
        // Check if current player has been kicked or is no longer in session
        const currentPlayerInSession = result.players.find(p => p.id === playerRef.current?.id);
        if (playerRef.current && (!currentPlayerInSession || currentPlayerInSession.status === 'kicked')) {
          console.log("loadGameStateWithSession: Player kicked or not in session, forcing leave.");
          leaveGame(); // Force player to re-join
          return; // Exit early as the player is no longer part of the game
        }
      } else {
        console.error("loadGameStateWithSession API error:", result.error);
        setError(result.error || "Failed to load game state");
        if (result.error && result.error.includes("not found")) {
          console.log("loadGameStateWithSession: Game not found, clearing localStorage and showing join form.");
          // If game not found, clear local storage for this session and force join form
          const allSessionsRaw = localStorage.getItem("bingoSessions");
          if (allSessionsRaw) {
            const allSessions = JSON.parse(allSessionsRaw);
            // Remove all players from this session
            const sessionPlayers = Object.keys(allSessions).filter(key => key.startsWith(`session_${sessionIdToUse}_player_`));
            sessionPlayers.forEach(playerKey => {
              delete allSessions[playerKey];
            });
            localStorage.setItem("bingoSessions", JSON.stringify(allSessions));
            console.log("loadGameStateWithSession - Removed all players from session:", sessionIdToUse);
          }
          localStorage.removeItem("bingoPlayer"); // Clean up old single-player key
          setPlayer(null);
          setGameState(null);
          setShowJoinForm(true);
          setSelectedSession(null); // Set to null to allow fresh input
          // setJoinForm(prev => ({ ...prev, sessionId: "VB-2025" })); // REMOVED: Let useEffect handle initial form state
        }
      }
    } catch (err) {
      console.error("loadGameStateWithSession: Connection error:", err);
      setError("Connection error");
    } finally {
      console.log("loadGameStateWithSession: Setting loading to FALSE in finally block.");
      setLoading(false);
    }
  }, [leaveGame]); // Removed selectedSession dependency

  const loadGameState = React.useCallback(async () => { // Wrapped in useCallback
    console.log("loadGameState called. selectedSession:", selectedSession);
    if (!selectedSession) {
      console.log("loadGameState: selectedSession is null/empty, returning.");
      setLoading(false); // Ensure loading is false if selectedSession is null/empty and loadGameState returns early
      return;
    }
    try {
      const response = await fetch("/api/get-game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedSession }),
      });
      const result = await response.json();
      console.log("loadGameState API response:", result);
      if (result.success) {
        setGameState(result);
        setError("");
        // Check if current player has been kicked or is no longer in session
        const currentPlayerInSession = result.players.find(p => p.id === player?.id);
        if (player && (!currentPlayerInSession || currentPlayerInSession.status === 'kicked')) {
          console.log("loadGameState: Player kicked or not in session, forcing leave.");
          leaveGame(); // Force player to re-join
          return; // Exit early as the player is no longer part of the game
        }
      } else {
        console.error("loadGameState API error:", result.error);
        setError(result.error || "Failed to load game state");
        if (result.error && result.error.includes("not found")) {
          console.log("loadGameState: Game not found, clearing localStorage and showing join form.");
          // If game not found, clear local storage for this session and force join form
          const allSessionsRaw = localStorage.getItem("bingoSessions");
          if (allSessionsRaw) {
            const allSessions = JSON.parse(allSessionsRaw);
            if (selectedSession && allSessions[selectedSession]) {
              delete allSessions[selectedSession];
              localStorage.setItem("bingoSessions", JSON.stringify(allSessions));
            }
            localStorage.removeItem("bingoPlayer"); // Clean up old single-player key
          }
          setPlayer(null);
          setGameState(null);
          setShowJoinForm(true);
          setSelectedSession(null); // Set to null to allow fresh input
          // setJoinForm(prev => ({ ...prev, sessionId: "VB-2025" })); // REMOVED: Let useEffect handle initial form state
        }
      }
    } catch (err) {
      console.error("loadGameState: Connection error:", err);
      setError("Connection error");
    } finally {
      console.log("loadGameState: Setting loading to FALSE in finally block.");
      setLoading(false);
    }
  }, [selectedSession, player, leaveGame]); // Added selectedSession and player to dependency array

  // Track latest drawn ball to drive cell highlight and recent draws UI
  React.useEffect(() => {
    if (!gameState || !gameState.session) return;
    const balls = gameState.session.drawnBalls || [];
    if (balls.length === 0) return;
    const latest = balls[balls.length - 1];
    if (latest !== lastDrawnBall) {
      setLastDrawnBall(latest);
      setHighlightActive(true);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightActive(false), 1200);

      // Update recent draws tube (keep up to 5 visible; animate 6th rolling out)
      setRecentDraws((prev) => {
        const next = [
          { value: latest, key: Date.now(), entering: true },
          ...prev.map((d) => ({ ...d, entering: false })),
        ];
        if (next.length > 5) {
          if (next[5]) next[5] = { ...next[5], exiting: true };
          setTimeout(() => {
            setRecentDraws((cur) => cur.slice(0, 5));
          }, 600);
        }
        setTimeout(() => {
          setRecentDraws((cur) => cur.map((d) => ({ ...d, entering: false })));
        }, 600);
        return next.slice(0, Math.min(next.length, 6));
      });
    }
  }, [gameState]);

  React.useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

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

  // Load teams when session changes
  React.useEffect(() => {
    if (joinForm.sessionId) {
      loadAvailableTeams(joinForm.sessionId);
    }
  }, [joinForm.sessionId]);

  const joinGame = async () => {
    if (!joinForm.nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }
    
    if (!joinForm.password.trim() || joinForm.password.length !== 4 || !/^\d{4}$/.test(joinForm.password)) {
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
          gameId: joinForm.sessionId.trim().toUpperCase(), // Ensure gameId is trimmed and uppercase
          nickname: joinForm.nickname.trim(),
          password: joinForm.password.trim(),
          teamId: joinForm.teamId || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Normalize marked cells from API
        const normalizedMarked = Array.isArray(result.player.markedCells)
          ? result.player.markedCells
              .filter((c) => c !== "BINGO")
              .map((c) => parseInt(c))
              .filter((n) => Number.isFinite(n))
          : [];

        const playerData = {
          id: result.player.id,
          nickname: result.player.nickname,
          avatar: result.player.avatar,
          sessionId: joinForm.sessionId.trim().toUpperCase(), // Ensure stored sessionId is trimmed and uppercase
          bingoCard: result.player.bingoCard,
          markedCells: normalizedMarked,
        };

        setPlayer(playerData);
        setSelectedSession(joinForm.sessionId.trim().toUpperCase()); // Ensure selectedSession state is trimmed and uppercase
        
        // Store player data using player-specific key format
        const allSessionsRaw = localStorage.getItem("bingoSessions");
        const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
        const playerSpecificKey = `session_${joinForm.sessionId.trim().toUpperCase()}_player_${joinForm.nickname.trim()}`;
        allSessions[playerSpecificKey] = playerData; // Use player-specific key
        localStorage.setItem("bingoSessions", JSON.stringify(allSessions));
        localStorage.removeItem("bingoPlayer"); // Clean up old single-player key
        setShowJoinForm(false);

        // Reload game state
        setTimeout(() => loadGameStateWithSession(joinForm.sessionId.trim().toUpperCase()), 500);
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

    // Use column-major indexing to match how the card is rendered and stored
    const index = col * 5 + row;
    const isAlreadyMarked = player.markedCells.includes(index);

    // Don't allow unmarking cells
    if (isAlreadyMarked) return;

    // Check if this number has been called
    const cellNumber = player.bingoCard[index];
    const isFree = col === 2 && row === 2;

    if (!isFree && !gameState.session.drawnBalls.includes(cellNumber)) {
      setError("This number hasn't been called yet!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const nextMarked = [...player.markedCells, index];
      const response = await fetch("/api/update-player-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          gameId: selectedSession,
          markedCells: nextMarked,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Normalize server response as well, in case it returns strings or sentinel
        const normalized = Array.isArray(result.player.markedCells)
          ? result.player.markedCells
              .filter((c) => c !== "BINGO")
              .map((c) => parseInt(c))
              .filter((n) => Number.isFinite(n))
          : nextMarked;
        const updatedPlayer = { ...player, markedCells: normalized };
        setPlayer(updatedPlayer);
        // Persist to session-specific storage using player-specific key
        const allSessionsRaw = localStorage.getItem("bingoSessions");
        const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
        const playerSpecificKey = `session_${selectedSession}_player_${player.nickname}`;
        allSessions[playerSpecificKey] = updatedPlayer;
        localStorage.setItem("bingoSessions", JSON.stringify(allSessions));
        playPencilSound();

        // Check for bingo
        const bingoResult = checkForBingo(nextMarked);
        if (bingoResult) {
          // Check if this is a line win or full card win
          const isFullCard = nextMarked.length >= 25;
          const winType = isFullCard ? "FULL CARD" : "LINE";
          const gameMode = gameState.session.bingoMode || 'standard';
          
          // Only show notifications and handle prizes in Standard mode
          if (gameMode === 'standard') {
            // Check if prize is already claimed
            const prizeAlreadyClaimed = isFullCard 
              ? gameState.session.fullCardPrizeClaimed 
              : gameState.session.linePrizeClaimed;
            
            if (prizeAlreadyClaimed) {
              alert(
                `🎯 ${winType} COMPLETED! 🎯\nYou have a winning pattern, but this prize has already been claimed by another player.`
              );
            } else {
              alert(
                `🎉 ${winType} BINGO! 🎉\nYou have a winning pattern! Call out to the host!`
              );
            }
            
            // Use new bell sound logic (only for Standard mode)
            playBellSound(
              isFullCard ? 'full_card' : 'line',
              gameMode,
              gameState.session.linePrizeClaimed,
              gameState.session.fullCardPrizeClaimed
            );
          }
          // In Manual mode: No automatic notifications, no bell sounds, no prize claiming
          // Players just mark their cards and wait for host to announce winners
          
          setHighlightedPattern(bingoResult);
          setTimeout(() => setHighlightedPattern(null), 3000);
        }
      } else {
        setError(result.error || "Failed to mark cell");
      }
    } catch (err) {
      setError("Failed to mark cell");
    }
  };

  const checkForBingo = (markedCells) => {
    // Convert to numeric set (defensive)
    const marked = new Set(
      (Array.isArray(markedCells) ? markedCells : []).map((c) => parseInt(c)).filter(Number.isFinite)
    );

    const winPatterns = [
      // Rows
      { type: 'row', index: 0, pattern: [0, 1, 2, 3, 4] },
      { type: 'row', index: 1, pattern: [5, 6, 7, 8, 9] },
      { type: 'row', index: 2, pattern: [10, 11, 12, 13, 14] },
      { type: 'row', index: 3, pattern: [15, 16, 17, 18, 19] },
      { type: 'row', index: 4, pattern: [20, 21, 22, 23, 24] },
      // Columns
      { type: 'column', index: 0, pattern: [0, 5, 10, 15, 20] },
      { type: 'column', index: 1, pattern: [1, 6, 11, 16, 21] },
      { type: 'column', index: 2, pattern: [2, 7, 12, 17, 22] },
      { type: 'column', index: 3, pattern: [3, 8, 13, 18, 23] },
      { type: 'column', index: 4, pattern: [4, 9, 14, 19, 24] },
      // Diagonals
      { type: 'diagonal', index: 1, pattern: [0, 6, 12, 18, 24] },
      { type: 'diagonal', index: 2, pattern: [4, 8, 12, 16, 20] },
    ];

    for (const winPattern of winPatterns) {
      if (winPattern.pattern.every((idx) => marked.has(idx))) {
        return winPattern; // Return the winning pattern object
      }
    }
    return null;
  };

  const getBallLetter = (number) => {
    if (number >= 1 && number <= 15) return "B";
    if (number >= 16 && number <= 30) return "I";
    if (number >= 31 && number <= 45) return "N";
    if (number >= 46 && number <= 60) return "G";
    return "O"; // 61-75
  };

  const getBallColorClass = (number) => {
    if (number >= 1 && number <= 15) return "bg-blue-500 border-blue-600"; // B (Blue)
    if (number >= 16 && number <= 30) return "bg-red-500 border-red-600"; // I (Red)
    if (number >= 31 && number <= 45) return "bg-white text-black border-gray-400"; // N (White)
    if (number >= 46 && number <= 60) return "bg-green-500 border-green-600"; // G (Green)
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
          {/* 🎰 Loading Vegas Luck Bingo... */}
          <img
            src="/LogoT.png"
            alt="Loading..."
            className="h-24 w-auto animate-pulse-slow mx-auto"
          />
          <p className="text-white/80 text-lg mt-4">Loading Vegas Luck Bingo...</p>
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
                  className="block text-[#FFD700] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #FFD700" }}
                >
                  4-Digit Password:
                </label>
                <input
                  type="password"
                  value={joinForm.password}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setJoinForm({ ...joinForm, password: value });
                  }}
                  placeholder="Enter 4-digit password"
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#FFD700]/50 rounded-lg text-white text-center focus:border-[#FFD700] focus:outline-none transition-colors duration-300 tracking-widest font-mono"
                  style={{ boxShadow: "0 0 10px rgba(255, 215, 0, 0.3)" }}
                  maxLength={4}
                  disabled={isJoining}
                />
                <p className="text-white/60 text-sm mt-2 text-center">
                  Use the same password to reconnect if disconnected
                </p>
              </div>

              <div>
                <label
                  className="block text-[#00CED1] font-bold mb-2"
                  style={{ textShadow: "0 0 5px #00CED1" }}
                >
                  Select Team (Optional):
                </label>
                <select
                  value={joinForm.teamId}
                  onChange={(e) => setJoinForm({ ...joinForm, teamId: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border-2 border-[#00CED1]/50 rounded-lg text-white focus:border-[#00CED1] focus:outline-none transition-colors duration-300"
                  style={{ boxShadow: "0 0 10px rgba(0, 206, 209, 0.3)" }}
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
        {/* Animations & Effects Styles */}
        <style>{`
          @keyframes subtleVibrate { 0%,100%{transform:translate3d(0,0,0)} 20%{transform:translate3d(0.6px,0,0)} 40%{transform:translate3d(-0.6px,0,0)} 60%{transform:translate3d(0.4px,0,0)} 80%{transform:translate3d(-0.4px,0,0)} }
          @keyframes neonFlash { 0%,100%{box-shadow:0 0 0px rgba(255,0,0,0)} 50%{box-shadow:0 0 18px rgba(255,0,0,0.9)} }
          .vibrate-subtle{ animation: subtleVibrate 220ms ease-in-out 0s 5; }
          .neon-flash{ animation: neonFlash 600ms ease-in-out 0s 2; }

          @keyframes feedIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes rollOut { to { transform: translateX(-140%); opacity: 0; } }
          .feed-in { animation: feedIn 500ms cubic-bezier(0.22, 1, 0.36, 1); }
          .roll-out { animation: rollOut 500ms ease-in forwards; }
          
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
        `}</style>
        {/* Header */}
        <div
          className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-6 mb-6"
          style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <h1
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF007F]"
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  textShadow: "0 0 10px #FFD700",
                }}
              >
                {/* 🎪 VEGAS LUCK BINGO */}
                <img src="/LogoT.png" alt="Vegas Luck Bingo Logo" className="h-12 w-auto inline-block align-middle mr-2"/> Welcome {player.nickname}
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
          {gameState.session.mode === "bingo" ? (
            // BINGO MODE
            <>
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

                {/* Bingo Grid (B 1–15, I 16–30, N 31–45, G 46–60, O 61–75) */}
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, col) => (
                    <div key={col} className="grid grid-rows-5 gap-2">
                      {Array.from({ length: 5 }).map((__, row) => {
                        const index = col * 5 + row; // column-major indexing
                        const number = player.bingoCard[index];
                        const isFree = col === 2 && row === 2;
                        const isCalled = gameState.session.drawnBalls.includes(number);
                        const shouldHighlight = highlightActive && number === lastDrawnBall;
                        const isMarkedIndex = player.markedCells.includes(index);
                        const isHighlighted = highlightedPattern && highlightedPattern.pattern.includes(index);
                        return (
                          <button
                            key={`${row}-${col}`}
                            onClick={() => markCell(row, col)}
                            disabled={isMarkedIndex || (!isFree && !isCalled)}
                            className={`relative aspect-square flex items-center justify-center text-lg font-bold rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                              gameState.session.status !== "active"
                                ? isFree
                                  ? "bg-gray-600 text-gray-300 border-gray-500"
                                  : "bg-gray-800 text-gray-400 border-gray-600 cursor-not-allowed"
                                : isFree
                                  ? "bg-black/80 text-black border-[#FFD700]"
                                  : isMarkedIndex
                                  ? "bg-[#00BFFF] text-white border-[#00BFFF] animate-pulse"
                                  : isCalled
                                  ? "bg-white text-[#FFD700] border-[#FFD700] hover:bg-gray-100 shadow-md"
                                  : "bg-white text-[#FFD700] border-gray-300 hover:bg-gray-50"
                            } ${
                              isHighlighted ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#1A0F2A]" : ""
                            }`}
                            style={{
                              ...(isMarkedIndex
                                ? { boxShadow: "0 0 15px #00BFFF" }
                                : isCalled && !isMarkedIndex && gameState.session.status === "active"
                                ? { boxShadow: "0 0 10px #FF0000" }
                                : {})
                            }}
                          >
                            {isFree ? (
                              <img
                                src="/LogoT.png"
                                alt="Free Space"
                                className="w-full h-full object-cover rounded-md"
                                style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.35))" }}
                              />
                            ) : (
                              number
                            )}
                            {isMarkedIndex && (
                              <span
                                className="pointer-events-none absolute inset-0 select-none"
                                aria-hidden="true"
                                style={{
                                  backgroundImage: "linear-gradient(45deg, rgba(255,0,0,0.8) 2px, transparent 2px), linear-gradient(-45deg, rgba(255,0,0,0.8) 2px, transparent 2px)",
                                  backgroundSize: "100% 2px, 2px 100%",
                                  backgroundPosition: "center",
                                  mixBlendMode: "screen",
                                  opacity: 0.7
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
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
                ) : gameState.session.status === "winner_announced" && gameState.session.winnerNickname ? (
                  <div className="text-center">
                    <div className="text-[#00FF00] text-3xl font-bold animate-pulse">
                      🏆 WINNER! 🏆
                    </div>
                    <div className="text-[#FFD700] text-2xl font-bold mt-2">
                      {gameState.session.winnerNickname}
                    </div>
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
                    {gameState.session.roundNumber}
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

            {/* Recent Draws Tube */}
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
              <div className="relative">
                <div className="overflow-hidden bg-white/5 border-2 border-[#00FF00]/40 rounded-full px-3 py-2">
                  <div className="flex items-center gap-3">
                    {recentDraws.length === 0 && (
                      <div className="text-white/60 text-sm py-1 px-2">No draws yet</div>
                    )}
                    {recentDraws.map((item, idx) => (
                      <div
                        key={item.key}
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2
                          ${getBallColorClass(item.value)}
                          ${idx === 0 ? "animate-pulse" : ""}
                          ${item.entering ? "feed-in" : ""} ${item.exiting ? "roll-out" : ""}`}
                        style={idx === 0 ? { boxShadow: "0 0 10px #FFD700" } : {}}
                      >
                        {getBallLetter(item.value)}-{item.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          ) : (
            // TRIVIA MODE
            <>
              {/* Trivia Question */}
              <div className="xl:col-span-2">
                <div
                  className="bg-black/80 backdrop-blur-sm border-2 border-[#00BFFF] rounded-2xl p-8"
                  style={{ boxShadow: "0 0 20px rgba(0, 191, 255, 0.3)" }}
                >
                  <h2
                    className="text-2xl font-bold text-[#00BFFF] mb-6 text-center"
                    style={{ textShadow: "0 0 10px #00BFFF" }}
                  >
                    🧠 TRIVIA QUESTION
                  </h2>

                  {gameState.currentQuestion ? (
                    <div className="space-y-6">
                      {/* Question */}
                      <div className="bg-black/40 rounded-xl p-6">
                        <h3 className="text-[#FFD700] font-bold text-xl mb-4">Question:</h3>
                        <p className="text-white text-lg">{gameState.currentQuestion.question}</p>
                      </div>

                      {/* Timer and Progress */}
                      <div className="bg-black/40 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[#00BFFF] font-bold text-sm">
                            Question {gameState.currentQuestion.questionNumber || 1} of {gameState.currentQuestion.totalQuestions || 20}
                          </div>
                          <div className="text-[#FF007F] font-bold">⏰ Time Remaining:</div>
                        </div>
                        
                        {timeRemaining > 0 ? (
                          <>
                            <div className="flex items-center justify-center gap-4 mb-3">
                              <div 
                                className={`text-2xl font-bold ${
                                  timeRemaining <= 5 ? "text-red-500 animate-pulse" : "text-[#FFD700]"
                                }`}
                              >
                                {timeRemaining}s
                              </div>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-1000 ${
                                  timeRemaining <= 5 ? "bg-red-500" : "bg-[#00BFFF]"
                                }`}
                                style={{
                                  width: `${(timeRemaining / 30) * 100}%`
                                }}
                              ></div>
                            </div>
                          </>
                                                 ) : gameState.session.currentQuestionStatus === 'paused' ? (
                           <div className="text-center">
                             <div className="text-yellow-500 font-bold text-lg">⏸️ Question Paused</div>
                           </div>
                         ) : (
                           <div className="text-center">
                             <div className="text-red-500 font-bold text-lg">⏰ Time's Up!</div>
                           </div>
                         )}
                      </div>

                      {/* Answer Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gameState.currentQuestion.answers.map((answer, index) => (
                          <button
                            key={index}
                            onClick={() => selectAnswer(index)}
                            disabled={timeRemaining === 0 || answerLocked}
                            className={`p-4 rounded-xl border-2 font-bold text-lg transition-all duration-300 ${
                              selectedAnswer === index
                                ? answerLocked
                                  ? "bg-green-600 border-green-600 text-white"
                                  : "bg-[#00BFFF] border-[#00BFFF] text-white"
                                : answerLocked
                                ? "bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed"
                                : timeRemaining === 0
                                ? "bg-red-600 border-red-600 text-red-300 cursor-not-allowed"
                                : "bg-black/40 border-white/30 text-white hover:border-[#00BFFF] hover:bg-[#00BFFF]/20"
                            }`}
                          >
                            <span className="text-[#FFD700] mr-2">
                              {String.fromCharCode(65 + index)}:
                            </span>
                            {answer}
                          </button>
                        ))}
                      </div>

                      {/* Lock In Button */}
                      {selectedAnswer !== null && timeRemaining > 0 && !answerLocked && (
                        <div className="text-center">
                          <button
                            onClick={lockInAnswer}
                            className="py-4 px-8 bg-gradient-to-r from-[#32CD32] to-[#00FF00] text-black font-bold rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                            style={{ boxShadow: "0 0 20px #32CD32" }}
                          >
                            🔒 LOCK IN ANSWER: {String.fromCharCode(65 + selectedAnswer)}
                          </button>
                        </div>
                      )}

                      {selectedAnswer !== null && !answerLocked && (
                        <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 text-center">
                          <div className="text-blue-300 font-bold">
                            🎯 Answer selected: {String.fromCharCode(65 + selectedAnswer)}
                          </div>
                          <div className="text-blue-200 text-sm mt-1">
                            Click "LOCK IN ANSWER" to submit your final answer
                          </div>
                        </div>
                      )}

                      {answerLocked && (
                        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 text-center">
                          <div className="text-green-300 font-bold">
                            ✅ Answer locked in: {String.fromCharCode(65 + selectedAnswer)}
                          </div>
                          <div className="text-green-200 text-sm mt-1">
                            Your answer has been submitted and cannot be changed
                          </div>
                        </div>
                      )}

                      {timeRemaining === 0 && gameState.session.currentQuestionStatus === 'active' && (
                        <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-center">
                          <div className="text-red-300 font-bold text-lg">
                            ⏰ Time's up! No more answers accepted
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-white/60 py-12">
                      <div className="text-6xl mb-4">❓</div>
                      <p className="text-xl">No active trivia question</p>
                      <p className="text-sm mt-2">Waiting for the host to start a question...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Trivia Info */}
              <div className="space-y-6">
                {/* Leaderboard */}
                <div
                  className="bg-black/80 backdrop-blur-sm border-2 border-[#FFD700] rounded-2xl p-6"
                  style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)" }}
                >
                  <h3
                    className="text-xl font-bold text-[#FFD700] mb-4"
                    style={{ textShadow: "0 0 10px #FFD700" }}
                  >
                    🏆 LEADERBOARD
                  </h3>
                  <div className="space-y-2">
                    {gameState.players
                      .sort((a, b) => gameState.session.mode === 'trivia' 
                        ? (b.triviaPoints || 0) - (a.triviaPoints || 0)
                        : b.wins - a.wins
                      )
                      .slice(0, 5)
                      .map((p, index) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            p.id === player.id ? "bg-[#00BFFF]/20 border border-[#00BFFF]" : "bg-black/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`text-lg font-bold ${
                              index === 0 ? "text-[#FFD700]" : 
                              index === 1 ? "text-gray-300" :
                              index === 2 ? "text-[#CD7F32]" : "text-white"
                            }`}>
                              #{index + 1}
                            </div>
                            <div className="text-white font-bold">{p.nickname}</div>
                            {p.teamName && (
                              <div 
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: p.teamColor + "40", color: p.teamColor }}
                              >
                                {p.teamName}
                              </div>
                            )}
                          </div>
                          <div className="text-[#00BFFF] font-bold">
                            {gameState.session.mode === 'trivia' ? (p.triviaPoints || 0) : p.wins} pts
                          </div>
                        </div>
                      ))}
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
                      <span className="text-white/80">Status:</span>
                      <span className={`font-bold ${
                        gameState.session.status === "active" ? "text-green-400" : 
                        gameState.session.status === "waiting" ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {gameState.session.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Round:</span>
                      <span className="text-[#FFD700] font-bold">
                        {gameState.session.roundNumber} / {gameState.session.maxRounds}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Players:</span>
                      <span className="text-[#00BFFF] font-bold">{gameState.players.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Your Score:</span>
                      <span className="text-[#FFD700] font-bold">
                        {gameState.session.mode === 'trivia' ? (player.triviaPoints || 0) : player.wins} points
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlayerPage;