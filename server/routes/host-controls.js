import express from 'express';
import sql from '../../src/lib/turso-database.js';

const router = express.Router();

function generateBingoCard() {
  const card = [];
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  for (let col = 0; col < 5; col++) {
    const column = [];
    const [min, max] = ranges[col];
    const used = new Set();

    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        column.push(0);
      } else {
        let num;
        do {
          num = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (used.has(num));
        used.add(num);
        column.push(num);
      }
    }
    card.push(column);
  }

  return card.flat();
}

async function handler({ action, gameId, playerId, gameMode, bingoMode, questionData, maxRounds, winType }) {
  if (!action) {
    return { error: "Action is required" };
  }

  try {
    switch (action) {
      case "create_session":
        if (!gameId) {
          return { error: "Game ID is required to create session" };
        }

        // Check if session already exists
        const existingSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (existingSession.length > 0) {
          return { error: "Session with this ID already exists" };
        }

        // Extract max rounds from request (default to 10 if not specified)
        const sessionMaxRounds = parseInt(maxRounds) || 10;
        
        // Validate max rounds range
        if (sessionMaxRounds < 1 || sessionMaxRounds > 40) {
          return { error: "Max rounds must be between 1 and 40" };
        }

        // Set game mode and bingo mode
        const sessionGameMode = gameMode || 'bingo';
        const sessionBingoMode = (sessionGameMode === 'bingo') ? (bingoMode || 'standard') : null;

        // Create new session
        const [newSession] = await sql`
          INSERT INTO game_sessions (game_id, status, mode, bingo_mode, round_number, max_rounds)
          VALUES (${gameId}, 'waiting', ${sessionGameMode}, ${sessionBingoMode}, 1, ${sessionMaxRounds})
          RETURNING id, game_id, status, mode, bingo_mode, round_number, max_rounds, created_at
        `;

        // Log session creation event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${newSession.id}, 'session_created', ${JSON.stringify({
          gameId: gameId,
          gameMode: sessionGameMode,
          bingoMode: sessionBingoMode,
          maxRounds: sessionMaxRounds,
          timestamp: new Date().toISOString(),
        })})
        `;

        return {
          success: true,
          message: `Session ${gameId} created successfully with ${sessionMaxRounds} max rounds (${sessionGameMode}${sessionBingoMode ? ` - ${sessionBingoMode}` : ''})`,
          session: {
            id: newSession.id,
            gameId: newSession.game_id,
            status: newSession.status,
            mode: newSession.mode,
            bingoMode: newSession.bingo_mode,
            roundNumber: newSession.round_number,
            maxRounds: newSession.max_rounds,
            createdAt: newSession.created_at,
          },
        };

      case "start_game":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const startSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (startSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          UPDATE game_sessions 
          SET status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE game_id = ${gameId}
        `;

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${startSession[0].id}, 'game_started', ${JSON.stringify({
          timestamp: new Date().toISOString(),
        })})
        `;

        return { success: true, status: "active", message: "Game started" };

      case "pause_game":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const pauseSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (pauseSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          UPDATE game_sessions 
          SET status = 'paused', updated_at = CURRENT_TIMESTAMP
          WHERE game_id = ${gameId}
        `;

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${pauseSession[0].id}, 'game_paused', ${JSON.stringify({
          timestamp: new Date().toISOString(),
        })})
        `;

        return { success: true, status: "paused", message: "Game paused" };

      case "end_game":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const endSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (endSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          UPDATE game_sessions 
          SET status = 'ended', updated_at = CURRENT_TIMESTAMP
          WHERE game_id = ${gameId}
        `;

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${endSession[0].id}, 'game_ended', ${JSON.stringify({
          timestamp: new Date().toISOString(),
        })})
        `;

        return { success: true, status: "ended", message: "Game ended" };

      case "kick_player":
        if (!gameId || !playerId) {
          return { error: "Game ID and Player ID are required" };
        }

        const kickSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (kickSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          UPDATE players 
          SET status = 'kicked', updated_at = CURRENT_TIMESTAMP, bingo_card = '[]', marked_cells = '[]'
          WHERE id = ${playerId} AND session_id = ${kickSession[0].id}
        `;

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${kickSession[0].id}, 'player_kicked', ${JSON.stringify({
          playerId: playerId,
          timestamp: new Date().toISOString(),
        })})
        `;

        return { success: true, message: "Player kicked successfully" };

      case "delete_session":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const deleteSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (deleteSession.length === 0) {
          return { error: "Game session not found" };
        }

        const sessionId = deleteSession[0].id;

        // Delete all related data (foreign key constraints will help, but let's be explicit)
        await sql`DELETE FROM player_answers WHERE player_id IN (SELECT id FROM players WHERE session_id = ${sessionId})`;
        await sql`DELETE FROM players WHERE session_id = ${sessionId}`;
        await sql`DELETE FROM game_events WHERE session_id = ${sessionId}`;
        await sql`DELETE FROM trivia_questions WHERE session_id = ${sessionId}`;
        await sql`DELETE FROM game_sessions WHERE id = ${sessionId}`;

        return {
          success: true,
          message: `Session ${gameId} has been deleted successfully`,
        };

      case "end_round":
        if (!gameId) {
          return { error: "Game ID is required to end the round" };
        }

        const endRoundSession = await sql`
          SELECT id, winner_nickname, round_number, max_rounds FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (endRoundSession.length === 0) {
          return { error: "Game session not found" };
        }

        const currentSessionId = endRoundSession[0].id;
        const lastWinner = endRoundSession[0].winner_nickname || null;
        const currentRound = endRoundSession[0].round_number;
        const endRoundMaxRounds = endRoundSession[0].max_rounds;

        // Check if max rounds reached
        if (currentRound >= endRoundMaxRounds) {
          return { 
            error: `Maximum rounds (${endRoundMaxRounds}) reached for this session. Cannot start another round.` 
          };
        }

        // Reset game state for a new round
        await sql`
          UPDATE game_sessions
          SET 
            status = 'waiting',
            current_ball = NULL,
            drawn_balls = '[]',
            round_number = round_number + 1,
            previous_round_winner = ${lastWinner},
            winner_nickname = NULL,
            line_prize_claimed = FALSE,
            full_card_prize_claimed = FALSE,
            line_winner_id = NULL,
            full_card_winner_id = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${currentSessionId}
        `;

        // Reset all players' marked cells and assign new bingo cards for this session
        const activePlayers = await sql`
          SELECT id, nickname FROM players 
          WHERE session_id = ${currentSessionId} AND status = 'active'
        `;

        for (const player of activePlayers) {
          const newBingoCard = generateBingoCard();
          await sql`
            UPDATE players 
            SET marked_cells = '[]', bingo_card = ${JSON.stringify(newBingoCard)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${player.id}
          `;

          // Log the new card assignment
          try {
            const hash = (JSON.stringify(newBingoCard) || "").split("").reduce((h, ch) => ((h * 31 + ch.charCodeAt(0)) >>> 0), 0);
            await sql`
              INSERT INTO game_events (session_id, event_type, event_data)
              VALUES (${currentSessionId}, 'card_assigned', ${JSON.stringify({
                playerId: player.id,
                nickname: player.nickname,
                cardHash: hash >>> 0,
                roundNumber: currentRound + 1,
                timestamp: new Date().toISOString(),
              })})
            `;
          } catch {}
        }

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${currentSessionId}, 'round_ended', ${JSON.stringify({
          roundNumber: currentRound,
          newRoundNumber: currentRound + 1,
          winner: lastWinner,
          timestamp: new Date().toISOString(),
        })})
        `;

        return { 
          success: true, 
          message: `Round ${currentRound} ended. Winner: ${lastWinner || 'None'}. Round ${currentRound + 1} started with new bingo cards for all players.`,
          currentRound: currentRound + 1,
          maxRounds: endRoundMaxRounds
        };

      case "list_sessions":
        const allSessions = await sql`
          SELECT 
            gs.game_id, 
            gs.status, 
            gs.mode, 
            gs.round_number,
            gs.max_rounds,
            gs.created_at,
            COUNT(p.id) as player_count
          FROM game_sessions gs
          LEFT JOIN players p ON gs.id = p.session_id AND p.status = 'active'
          GROUP BY gs.id, gs.game_id, gs.status, gs.mode, gs.round_number, gs.max_rounds, gs.created_at
          ORDER BY gs.created_at DESC
        `;

        const sessions = allSessions.map(session => ({
          gameId: session.game_id,
          status: session.status,
          mode: session.mode,
          roundNumber: session.round_number,
          maxRounds: session.max_rounds,
          playerCount: parseInt(session.player_count) || 0,
          createdAt: session.created_at
        }));

        return {
          success: true,
          sessions: sessions,
          count: sessions.length
        };

      case "view_player_card":
        if (!playerId) {
          return { error: "Player ID is required to view player card" };
        }

        const playerCard = await sql`
          SELECT 
            p.id,
            p.nickname,
            p.bingo_card,
            p.marked_cells,
            p.status,
            p.session_id,
            p.created_at,
            p.updated_at
          FROM players p
          WHERE p.id = ${playerId}
        `;

        if (playerCard.length === 0) {
          return { error: "Player not found" };
        }

        const parsedPlayerCard = {
          ...playerCard[0],
          bingoCard: JSON.parse(playerCard[0].bingo_card),
          markedCells: JSON.parse(playerCard[0].marked_cells),
        };
        return {
          success: true,
          player: {
            id: parsedPlayerCard.id,
            nickname: parsedPlayerCard.nickname, // Use nickname
            bingoCard: parsedPlayerCard.bingoCard,
            markedCells: parsedPlayerCard.markedCells,
            status: parsedPlayerCard.status,
            sessionId: parsedPlayerCard.session_id,
            createdAt: parsedPlayerCard.created_at,
            updatedAt: parsedPlayerCard.updated_at,
          },
        };

      case "announce_winner":
        if (!gameId || !playerId) {
          return { error: "Game ID and Player ID are required to announce a winner" };
        }

        console.log("host-controls - Announcing winner for gameId:", gameId, "playerId:", playerId);

        const announceWinnerSession = await sql`
          SELECT id, round_number, bingo_mode, line_prize_claimed, full_card_prize_claimed, line_winner_id, full_card_winner_id
          FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (announceWinnerSession.length === 0) {
          console.log("host-controls - Game session not found for announce_winner");
          return { error: "Game session not found" };
        }

        const announceSessionData = announceWinnerSession[0];

        const winnerNickname = await sql`
          SELECT nickname FROM players WHERE id = ${playerId} AND session_id = ${announceSessionData.id}
        `;

        if (winnerNickname.length === 0) {
          console.log("host-controls - Player not found for announce_winner");
          return { error: "Player not found in this session" };
        }

        console.log("host-controls - Winner nickname:", winnerNickname[0].nickname, "Round:", announceSessionData.round_number);

        // Check if this is a line winner announcement (if line prize not claimed yet)
        if (!announceSessionData.line_prize_claimed) {
          // Announce as line winner
          await sql`
            UPDATE game_sessions 
            SET line_prize_claimed = TRUE, line_winner_id = ${playerId}, updated_at = CURRENT_TIMESTAMP
            WHERE game_id = ${gameId}
          `;

          const lineEventData = {
            playerId: playerId,
            nickname: winnerNickname[0].nickname,
            roundNumber: announceSessionData.round_number,
            winType: 'line',
            bingoMode: announceSessionData.bingo_mode,
            prizeClaimed: true,
            timestamp: new Date().toISOString(),
          };

          console.log("host-controls - Inserting line winner_announced event with data:", lineEventData);

          await sql`
            INSERT INTO game_events (session_id, event_type, event_data)
            VALUES (${announceSessionData.id}, 'winner_announced', ${JSON.stringify(lineEventData)})
          `;

          console.log("host-controls - Line winner announced successfully");

          return { 
            success: true, 
            status: "winner_announced", 
            message: `🎉 ${winnerNickname[0].nickname} wins the LINE! 🏆` 
          };
        }
        // Check if this is a full card winner announcement (if full card prize not claimed yet)
        else if (!announceSessionData.full_card_prize_claimed) {
          // Announce as full card winner
          await sql`
            UPDATE game_sessions 
            SET full_card_prize_claimed = TRUE, full_card_winner_id = ${playerId}, updated_at = CURRENT_TIMESTAMP
            WHERE game_id = ${gameId}
          `;

          // Update player wins for full card
          await sql`
            UPDATE players 
            SET wins = wins + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${playerId}
          `;

          const fullCardEventData = {
            playerId: playerId,
            nickname: winnerNickname[0].nickname,
            roundNumber: announceSessionData.round_number,
            winType: 'full_card',
            bingoMode: announceSessionData.bingo_mode,
            prizeClaimed: true,
            timestamp: new Date().toISOString(),
          };

          console.log("host-controls - Inserting full card winner_announced event with data:", fullCardEventData);

          await sql`
            INSERT INTO game_events (session_id, event_type, event_data)
            VALUES (${announceSessionData.id}, 'winner_announced', ${JSON.stringify(fullCardEventData)})
          `;

          console.log("host-controls - Full card winner announced successfully");

          return { 
            success: true, 
            status: "winner_announced", 
            message: `🎉 ${winnerNickname[0].nickname} wins the FULL CARD! 🏆` 
          };
        }
        // If both prizes are claimed, just announce as general winner
        else {
          await sql`
            UPDATE game_sessions 
            SET status = 'winner_announced', winner_nickname = ${winnerNickname[0].nickname}, updated_at = CURRENT_TIMESTAMP
            WHERE game_id = ${gameId}
          `;

          const eventData = {
            playerId: playerId,
            nickname: winnerNickname[0].nickname,
            roundNumber: announceSessionData.round_number,
            winType: 'general',
            bingoMode: announceSessionData.bingo_mode,
            prizeClaimed: true,
            timestamp: new Date().toISOString(),
          };

          console.log("host-controls - Inserting general winner_announced event with data:", eventData);

          await sql`
            INSERT INTO game_events (session_id, event_type, event_data)
            VALUES (${announceSessionData.id}, 'winner_announced', ${JSON.stringify(eventData)})
          `;

          console.log("host-controls - General winner announced successfully");

          return { 
            success: true, 
            status: "winner_announced", 
            message: `🎉 ${winnerNickname[0].nickname} is the winner! 🏆` 
          };
        }

      case "announce_winner_manual":
        if (!gameId || !playerId || !winType) {
          return { error: "Game ID, Player ID, and Win Type are required" };
        }

        console.log("host-controls - Manual winner announcement for gameId:", gameId, "playerId:", playerId, "winType:", winType);

        const manualWinnerSession = await sql`
          SELECT id, round_number, bingo_mode, line_prize_claimed, full_card_prize_claimed, line_winner_id, full_card_winner_id
          FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (manualWinnerSession.length === 0) {
          console.log("host-controls - Game session not found for manual announce");
          return { error: "Game session not found" };
        }

        const sessionData = manualWinnerSession[0];

        // Check if prize is already claimed
        if (winType === 'line' && sessionData.line_prize_claimed) {
          return { error: "Line prize has already been claimed" };
        }
        if (winType === 'full_card' && sessionData.full_card_prize_claimed) {
          return { error: "Full card prize has already been claimed" };
        }

        const manualWinnerNickname = await sql`
          SELECT nickname FROM players WHERE id = ${playerId} AND session_id = ${sessionData.id}
        `;

        if (manualWinnerNickname.length === 0) {
          console.log("host-controls - Player not found for manual announce");
          return { error: "Player not found in this session" };
        }

        console.log("host-controls - Manual winner nickname:", manualWinnerNickname[0].nickname, "Round:", sessionData.round_number, "WinType:", winType);

        // Update session status and winner
        let updateQuery;
        if (winType === 'line') {
          updateQuery = sql`
            UPDATE game_sessions 
            SET line_prize_claimed = TRUE, line_winner_id = ${playerId}, updated_at = CURRENT_TIMESTAMP
            WHERE game_id = ${gameId}
          `;
        } else if (winType === 'full_card') {
          updateQuery = sql`
            UPDATE game_sessions 
            SET full_card_prize_claimed = TRUE, full_card_winner_id = ${playerId}, updated_at = CURRENT_TIMESTAMP
            WHERE game_id = ${gameId}
          `;
        }

        await updateQuery;

        // Update player wins for full card
        if (winType === 'full_card') {
          await sql`
            UPDATE players 
            SET wins = wins + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${playerId}
          `;
        }

        const manualEventData = {
          playerId: playerId,
          nickname: manualWinnerNickname[0].nickname,
          roundNumber: sessionData.round_number,
          winType: winType,
          bingoMode: sessionData.bingo_mode,
          prizeClaimed: true,
          timestamp: new Date().toISOString(),
        };

        console.log("host-controls - Inserting manual winner_announced event with data:", manualEventData);

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${sessionData.id}, 'winner_announced', ${JSON.stringify(manualEventData)})
        `;

        console.log("host-controls - Manual winner announced successfully");

        return { 
          success: true, 
          status: "winner_announced", 
          message: `${winType.toUpperCase()} winner announced: ${manualWinnerNickname[0].nickname}` 
        };

      case "switch_mode":
        if (!gameId || !gameMode) {
          return { error: "Game ID and mode are required" };
        }

        const modeSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (modeSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          UPDATE game_sessions 
          SET mode = ${gameMode}, updated_at = CURRENT_TIMESTAMP
          WHERE game_id = ${gameId}
        `;

        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${modeSession[0].id}, 'mode_switched', ${JSON.stringify({
          newMode: gameMode,
          timestamp: new Date().toISOString(),
        })})
        `;

        return { success: true, mode: gameMode, message: "Game mode switched" };

      case "add_question":
        if (!gameId || !questionData) {
          return { error: "Game ID and question data are required" };
        }

        const addQuestionSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (addQuestionSession.length === 0) {
          return { error: "Game session not found" };
        }

        const [newQuestion] = await sql`
          INSERT INTO trivia_questions (session_id, question_text, answers_json, correct_answer_index, time_limit_seconds, media_url)
          VALUES (
            ${addQuestionSession[0].id},
            ${questionData.question},
            ${JSON.stringify(questionData.answers)},
            ${questionData.correctAnswer},
            ${questionData.timeLimit || 15},
            ${questionData.mediaUrl}
          )
          RETURNING id
        `;

        return {
          success: true,
          message: "Question added successfully",
          questionId: newQuestion.id,
        };

      case "update_question":
        if (!gameId || !questionData || !questionData.id) {
          return { error: "Game ID, question data, and question ID are required" };
        }

        const updateQuestionSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (updateQuestionSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          UPDATE trivia_questions SET
            question_text = ${questionData.question},
            answers_json = ${JSON.stringify(questionData.answers)},
            correct_answer_index = ${questionData.correctAnswer},
            time_limit_seconds = ${questionData.timeLimit || 15},
            media_url = ${questionData.mediaUrl},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${questionData.id} AND session_id = ${updateQuestionSession[0].id}
        `;

        return { success: true, message: "Question updated successfully" };

      case "delete_question":
        if (!gameId || !questionData || !questionData.id) {
          return { error: "Game ID, question data, and question ID are required" };
        }

        const deleteQuestionSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (deleteQuestionSession.length === 0) {
          return { error: "Game session not found" };
        }

        await sql`
          DELETE FROM trivia_questions 
          WHERE id = ${questionData.id} AND session_id = ${deleteQuestionSession[0].id}
        `;

        return { success: true, message: "Question deleted successfully" };
      
      default:
        return { error: "Unknown action" };
    }
  } catch (error) {
    console.error("Host controls error:", error);
    return { error: "Failed to execute action: " + error.message };
  }
}

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;
