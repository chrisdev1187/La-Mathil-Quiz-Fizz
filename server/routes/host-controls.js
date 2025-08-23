import express from 'express';
import sql from '../database.js';

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

async function handler({ action, gameId, playerId, gameMode, bingoMode, questionData, maxRounds, winType, newMode, themeId }) {
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

        // Set game mode and bingo mode - always use manual mode for integrated trivia & bingo
        const sessionGameMode = gameMode || 'bingo';
        const sessionBingoMode = 'manual'; // Force manual mode for all games

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

        const deleteSessionId = deleteSession[0].id;

        // Delete all related data (foreign key constraints will help, but let's be explicit)
        await sql`DELETE FROM player_answers WHERE player_id IN (SELECT id FROM players WHERE session_id = ${deleteSessionId})`;
        await sql`DELETE FROM players WHERE session_id = ${deleteSessionId}`;
        await sql`DELETE FROM game_events WHERE session_id = ${deleteSessionId}`;
        await sql`DELETE FROM trivia_questions WHERE session_id = ${deleteSessionId}`;
        await sql`DELETE FROM game_sessions WHERE id = ${deleteSessionId}`;

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
          RETURNING id, question_text as question, answers_json as answers, correct_answer_index as correct_answer, time_limit_seconds as time_limit, media_url
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

        const [updatedQuestion] = await sql`
          UPDATE trivia_questions SET
            question_text = ${questionData.question},
            answers_json = ${JSON.stringify(questionData.answers)},
            correct_answer_index = ${questionData.correctAnswer},
            time_limit_seconds = ${questionData.timeLimit || 15},
            media_url = ${questionData.mediaUrl},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${questionData.id} AND session_id = ${updateQuestionSession[0].id}
          RETURNING id, question_text as question, answers_json as answers, correct_answer_index as correct_answer, time_limit_seconds as time_limit, media_url
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
      
      case "switch_mode":
        console.log(`host-controls - Switch mode request: gameId=${gameId}, newMode=${newMode}`);
        
        if (!gameId || !newMode) {
          console.log(`host-controls - Missing required fields: gameId=${gameId}, newMode=${newMode}`);
          return { error: "Game ID and new mode are required" };
        }

        if (!['bingo', 'trivia'].includes(newMode)) {
          console.log(`host-controls - Invalid mode: ${newMode}`);
          return { error: "Mode must be 'bingo' or 'trivia'" };
        }

        // Get session
        const switchSession = await sql`
          SELECT id, status FROM game_sessions WHERE game_id = ${gameId}
        `;

        console.log(`host-controls - Found session:`, switchSession);

        if (switchSession.length === 0) {
          console.log(`host-controls - Session not found for gameId: ${gameId}`);
          return { error: "Session not found" };
        }

        const switchSessionId = switchSession[0].id;

        // Update session mode
        await sql`
          UPDATE game_sessions 
          SET mode = ${newMode}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${switchSessionId}
        `;

        console.log(`host-controls - Updated session ${switchSessionId} mode to ${newMode}`);

        // Log mode switch event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${switchSessionId}, 'mode_switched', ${JSON.stringify({
            newMode: newMode,
            timestamp: new Date().toISOString(),
          })})
        `;

        console.log(`host-controls - Mode switch successful for session ${switchSessionId}`);

        return {
          success: true,
          message: `Game mode switched to ${newMode}`,
          newMode: newMode
        };

      case "start_question":
        if (!gameId || !questionData || !questionData.id) {
          return { error: "Game ID and question ID are required" };
        }

        const startQuestionSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (startQuestionSession.length === 0) {
          return { error: "Game session not found" };
        }

        const startQuestionSessionId = startQuestionSession[0].id;

        // Get the question details
        const questionResult = await sql`
          SELECT id, question_text, answers_json, correct_answer_index, time_limit_seconds, points
          FROM trivia_questions 
          WHERE id = ${questionData.id} AND session_id = ${startQuestionSessionId}
        `;

        if (questionResult.length === 0) {
          return { error: "Question not found" };
        }

        const question = questionResult[0];
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (question.time_limit_seconds * 1000));

        // Update session with current question
        await sql`
          UPDATE game_sessions 
          SET 
            current_question_index = ${question.id},
            current_question_status = 'active',
            question_start_time = ${startTime.toISOString()},
            question_end_time = ${endTime.toISOString()},
            time_remaining = ${question.time_limit_seconds},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${startQuestionSessionId}
        `;

        // Update question status
        await sql`
          UPDATE trivia_questions 
          SET question_status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${question.id}
        `;

        // Set up automatic timer expiration
        setTimeout(async () => {
          try {
            // Check if question is still active
            const currentSession = await sql`
              SELECT id, current_question_status, current_question_index
              FROM game_sessions WHERE id = ${startQuestionSessionId}
            `;
            
            if (currentSession.length > 0 && 
                currentSession[0].current_question_status === 'active' && 
                currentSession[0].current_question_index === question.id) {
              
              // Auto-end the question
              await sql`
                UPDATE game_sessions 
                SET 
                  current_question_status = 'results',
                  time_remaining = 0,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ${startQuestionSessionId}
              `;

              await sql`
                UPDATE trivia_questions 
                SET question_status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE id = ${question.id}
              `;

              console.log(`Auto-ended question ${question.id} due to time expiration`);
            }
          } catch (error) {
            console.error("Error auto-ending question:", error);
          }
        }, question.time_limit_seconds * 1000);

        // Log question start event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${startQuestionSessionId}, 'question_started', ${JSON.stringify({
            questionId: question.id,
            questionText: question.question_text,
            timeLimit: question.time_limit_seconds,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            points: question.points
          })})
        `;

        return {
          success: true,
          message: "Question started successfully",
          question: {
            id: question.id,
            question: question.question_text,
            answers: JSON.parse(question.answers_json),
            correctAnswer: question.correct_answer_index,
            timeLimit: question.time_limit_seconds,
            points: question.points,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          }
        };

      case "end_question":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const endQuestionSession = await sql`
          SELECT id, current_question_index, current_question_status
          FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (endQuestionSession.length === 0) {
          return { error: "Game session not found" };
        }

        const endSessionId = endQuestionSession[0].id;
        const currentQuestionId = endQuestionSession[0].current_question_index;

        if (!currentQuestionId || endQuestionSession[0].current_question_status !== 'active') {
          return { error: "No active question to end" };
        }

        // Get question details for results
        const endQuestionResult = await sql`
          SELECT id, question_text, answers_json, correct_answer_index, points
          FROM trivia_questions WHERE id = ${currentQuestionId}
        `;

        if (endQuestionResult.length === 0) {
          return { error: "Question not found" };
        }

        const endQuestion = endQuestionResult[0];

        // Get all answers for this question
        const answersResult = await sql`
          SELECT 
            pa.id,
            pa.player_id,
            pa.answer_index,
            pa.is_correct,
            pa.points_earned,
            pa.response_time_seconds,
            p.nickname,
            p.trivia_points
          FROM player_answers pa
          JOIN players p ON pa.player_id = p.id
          WHERE pa.question_id = ${currentQuestionId}
          ORDER BY pa.points_earned DESC, pa.response_time_seconds ASC
        `;

        // Calculate results
        const results = {
          questionId: endQuestion.id,
          questionText: endQuestion.question_text,
          correctAnswer: endQuestion.correct_answer_index,
          answers: JSON.parse(endQuestion.answers_json),
          points: endQuestion.points,
          totalAnswers: answersResult.length,
          correctAnswers: answersResult.filter(a => a.is_correct).length,
          playerResults: answersResult.map(answer => ({
            playerId: answer.player_id,
            nickname: answer.nickname,
            answerIndex: answer.answer_index,
            isCorrect: answer.is_correct,
            pointsEarned: answer.points_earned,
            responseTime: answer.response_time_seconds,
            previousPoints: answer.trivia_points
          }))
        };

        // Update session
        await sql`
          UPDATE game_sessions 
          SET 
            current_question_status = 'results',
            time_remaining = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${endSessionId}
        `;

        // Update question status
        await sql`
          UPDATE trivia_questions 
          SET question_status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${currentQuestionId}
        `;

        // Log question end event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${endSessionId}, 'question_ended', ${JSON.stringify(results)})
        `;

        return {
          success: true,
          message: "Question ended successfully",
          results: results
        };

      case "get_question_results":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const resultsSession = await sql`
          SELECT id, current_question_index
          FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (resultsSession.length === 0) {
          return { error: "Game session not found" };
        }

        const resultsSessionId = resultsSession[0].id;
        const resultsQuestionId = resultsSession[0].current_question_index;

        if (!resultsQuestionId) {
          return { error: "No question to get results for" };
        }

        // Get the most recent question_ended event
        const resultsEvent = await sql`
          SELECT event_data
          FROM game_events 
          WHERE session_id = ${resultsSessionId} 
            AND event_type = 'question_ended'
          ORDER BY created_at DESC 
          LIMIT 1
        `;

        if (resultsEvent.length === 0) {
          return { error: "No results available" };
        }

        return {
          success: true,
          results: JSON.parse(resultsEvent[0].event_data)
        };

      case "list_questions":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        const listQuestionsSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (listQuestionsSession.length === 0) {
          return { error: "Game session not found" };
        }

        const listSessionId = listQuestionsSession[0].id;

        const questions = await sql`
          SELECT 
            id, 
            question_text as question, 
            answers_json as answers, 
            correct_answer_index as correct_answer, 
            time_limit_seconds as time_limit, 
            category,
            difficulty,
            points,
            media_url,
            question_status,
            created_at
          FROM trivia_questions 
          WHERE session_id = ${listSessionId}
          ORDER BY created_at DESC
        `;

        return {
          success: true,
          questions: questions.map(q => ({
            ...q,
            answers: JSON.parse(q.answers || '[]')
          }))
        };

      case "get_available_quizzes":
        console.log("host-controls - Getting available quiz themes from database");
        try {
          // Get all quiz themes with their question counts
          const themes = await sql`
            SELECT 
              t.id,
              t.name,
              t.description,
              t.category,
              t.difficulty,
              t.total_questions,
              t.time_limit_per_question,
              t.points_per_question,
              t.is_active,
              COUNT(q.id) as actual_questions,
              t.created_at
            FROM quiz_themes t
            LEFT JOIN quiz_questions q ON t.id = q.theme_id
            WHERE t.is_active = TRUE
            GROUP BY t.id, t.name, t.description, t.category, t.difficulty, t.total_questions, t.time_limit_per_question, t.points_per_question, t.is_active, t.created_at
            ORDER BY t.category, t.name
          `;

          console.log(`host-controls - Found ${themes.length} available quiz themes`);

          return {
            success: true,
            themes: themes.map(theme => ({
              ...theme,
              actual_questions: parseInt(theme.actual_questions)
            }))
          };
        } catch (error) {
          console.error("Error getting available quiz themes:", error);
          return { error: "Failed to get available quiz themes: " + error.message };
        }

      case "start_theme_quiz":
        console.log("host-controls - Starting theme quiz");
        console.log("host-controls - Received parameters:", { gameId, themeId });
        try {
          if (!gameId || !themeId) {
            console.log("host-controls - Missing required parameters:", { gameId, themeId });
            return { error: "Game ID and theme ID are required" };
          }

          // Get the theme and its questions
          const theme = await sql`
            SELECT * FROM quiz_themes WHERE id = ${themeId} AND is_active = TRUE
          `;

          if (theme.length === 0) {
            return { error: "Theme not found or inactive" };
          }

          const questions = await sql`
            SELECT * FROM quiz_questions 
            WHERE theme_id = ${themeId} 
            ORDER BY question_number
          `;

          if (questions.length === 0) {
            return { error: "No questions found for this theme" };
          }

          // Get session
          const session = await sql`
            SELECT id FROM game_sessions WHERE game_id = ${gameId}
          `;

          if (session.length === 0) {
            return { error: "Session not found" };
          }

          const sessionId = session[0].id;

          // Add all questions from the theme to the session
          const addedQuestions = [];
          for (const question of questions) {
            const [addedQuestion] = await sql`
              INSERT INTO trivia_questions (session_id, question_text, answers_json, correct_answer_index, time_limit_seconds, category, difficulty, points, question_status)
              VALUES (${sessionId}, ${question.question_text}, ${question.answers_json}, ${question.correct_answer_index}, ${question.time_limit_seconds}, ${theme[0].category}, ${theme[0].difficulty}, ${question.points}, 'inactive')
              RETURNING id
            `;
            addedQuestions.push(addedQuestion);
          }

          // Start the first question
          if (addedQuestions.length > 0) {
            const firstQuestionId = addedQuestions[0].id;
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + (30 * 1000)); // Global 30 seconds

            // Update session with current question
            await sql`
              UPDATE game_sessions 
              SET 
                current_question_index = ${firstQuestionId},
                current_question_status = 'active',
                question_start_time = ${startTime.toISOString()},
                question_end_time = ${endTime.toISOString()},
                time_remaining = 30,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ${sessionId}
            `;

            // Update question status
            await sql`
              UPDATE trivia_questions 
              SET question_status = 'active', updated_at = CURRENT_TIMESTAMP
              WHERE id = ${firstQuestionId}
            `;

            // Log theme quiz start event
            await sql`
              INSERT INTO game_events (session_id, event_type, event_data)
              VALUES (${sessionId}, 'theme_quiz_started', ${JSON.stringify({
                themeId: themeId,
                themeName: theme[0].name,
                totalQuestions: questions.length,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
              })})
            `;

            console.log(`host-controls - Theme quiz started: ${theme[0].name} with ${questions.length} questions`);

            return {
              success: true,
              message: `Theme quiz "${theme[0].name}" started with ${questions.length} questions`,
              theme: {
                id: theme[0].id,
                name: theme[0].name,
                category: theme[0].category,
                totalQuestions: questions.length
              },
              currentQuestion: {
                id: firstQuestionId,
                question: questions[0].question_text,
                answers: JSON.parse(questions[0].answers_json),
                correctAnswer: questions[0].correct_answer_index,
                timeLimit: questions[0].time_limit_seconds,
                points: questions[0].points,
                questionNumber: 1,
                totalQuestions: questions.length
              }
            };
          }

          return { error: "Failed to start theme quiz" };
        } catch (error) {
          console.error("Error starting theme quiz:", error);
          return { error: "Failed to start theme quiz: " + error.message };
        }

      case "clear_all_sessions":
        try {
          // Delete all game sessions and related data
          await sql`DELETE FROM game_events`;
          await sql`DELETE FROM player_answers`;
          await sql`DELETE FROM trivia_questions`;
          await sql`DELETE FROM players`;
          await sql`DELETE FROM teams`;
          await sql`DELETE FROM game_sessions`;
          
          return {
            success: true,
            message: "All game sessions and related data have been cleared successfully"
          };
        } catch (error) {
          console.error("Error clearing all sessions:", error);
          return { error: "Failed to clear all sessions: " + error.message };
        }

      case "clear_all_players":
        try {
          // Delete all players and their data
          await sql`DELETE FROM player_answers`;
          await sql`DELETE FROM players`;
          
          return {
            success: true,
            message: "All player data has been cleared successfully"
          };
        } catch (error) {
          console.error("Error clearing all players:", error);
          return { error: "Failed to clear all players: " + error.message };
        }

      case "clear_all_game_records":
        try {
          // Delete all game events and records
          await sql`DELETE FROM game_events`;
          await sql`DELETE FROM player_answers`;
          
          return {
            success: true,
            message: "All game records have been cleared successfully"
          };
        } catch (error) {
          console.error("Error clearing all game records:", error);
          return { error: "Failed to clear all game records: " + error.message };
        }

      case "next_question":
        console.log("host-controls - Starting next question");
        try {
          if (!gameId) {
            return { error: "Game ID is required" };
          }

          // Get session
          const session = await sql`
            SELECT id FROM game_sessions WHERE game_id = ${gameId}
          `;

          if (session.length === 0) {
            return { error: "Session not found" };
          }

          const sessionId = session[0].id;

          // Get all questions for this session
          const questions = await sql`
            SELECT id, question_text, answers_json, correct_answer_index, time_limit_seconds, points, question_status
            FROM trivia_questions 
            WHERE session_id = ${sessionId}
            ORDER BY id
          `;

          if (questions.length === 0) {
            return { error: "No questions found for this session" };
          }

          // Find the next question to start
          let nextQuestion = null;
          for (let i = 0; i < questions.length; i++) {
            if (questions[i].question_status === 'inactive') {
              nextQuestion = questions[i];
              break;
            }
          }

          if (!nextQuestion) {
            return { error: "No more questions available" };
          }

          // Start the next question
          const startTime = new Date();
          const timeLimit = nextQuestion.time_limit_seconds || 30;
          const endTime = new Date(startTime.getTime() + (timeLimit * 1000));

          // Update session with current question
          await sql`
            UPDATE game_sessions 
            SET 
              current_question_index = ${nextQuestion.id},
              current_question_status = 'active',
              question_start_time = ${startTime.toISOString()},
              question_end_time = ${endTime.toISOString()},
              time_remaining = ${timeLimit},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${sessionId}
          `;

          // Update question status
          await sql`
            UPDATE trivia_questions 
            SET question_status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${nextQuestion.id}
          `;

          console.log(`host-controls - Next question started: ${nextQuestion.id}`);

          return {
            success: true,
            message: `Next question started successfully`,
            question: {
              id: nextQuestion.id,
              question: nextQuestion.question_text,
              answers: JSON.parse(nextQuestion.answers_json),
              correctAnswer: nextQuestion.correct_answer_index,
              timeLimit: nextQuestion.time_limit_seconds,
              points: nextQuestion.points
            }
          };
        } catch (error) {
          console.error("Error starting next question:", error);
          return { error: "Failed to start next question: " + error.message };
        }

      case "pause_question":
        console.log("host-controls - Pausing/resuming question");
        try {
          if (!gameId) {
            return { error: "Game ID is required" };
          }

          // Get session
          const session = await sql`
            SELECT id, current_question_status, time_remaining FROM game_sessions WHERE game_id = ${gameId}
          `;

          if (session.length === 0) {
            return { error: "Session not found" };
          }

          const sessionId = session[0].id;
          const currentStatus = session[0].current_question_status;
          const timeRemaining = session[0].time_remaining;

          let newStatus, message;
          if (currentStatus === 'active') {
            // Pause the question
            newStatus = 'paused';
            message = 'Question paused successfully';
          } else if (currentStatus === 'paused') {
            // Resume the question
            newStatus = 'active';
            message = 'Question resumed successfully';
          } else {
            return { error: "Question is not in a state that can be paused/resumed" };
          }

          // Update session status
          await sql`
            UPDATE game_sessions 
            SET 
              current_question_status = ${newStatus},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${sessionId}
          `;

          console.log(`host-controls - Question ${newStatus}: ${sessionId}`);

          return {
            success: true,
            message: message,
            status: newStatus
          };
        } catch (error) {
          console.error("Error pausing/resuming question:", error);
          return { error: "Failed to pause/resume question: " + error.message };
        }

      case "end_quiz":
        console.log("host-controls - Ending quiz");
        try {
          if (!gameId) {
            return { error: "Game ID is required" };
          }

          // Get session
          const session = await sql`
            SELECT id FROM game_sessions WHERE game_id = ${gameId}
          `;

          if (session.length === 0) {
            return { error: "Session not found" };
          }

          const sessionId = session[0].id;

          // End all questions in the session
          await sql`
            UPDATE trivia_questions 
            SET question_status = 'ended', updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ${sessionId}
          `;

          // Update session status
          await sql`
            UPDATE game_sessions 
            SET 
              current_question_status = 'inactive',
              current_question_index = NULL,
              question_start_time = NULL,
              question_end_time = NULL,
              time_remaining = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${sessionId}
          `;

          // Log quiz end event
          await sql`
            INSERT INTO game_events (session_id, event_type, event_data)
            VALUES (${sessionId}, 'quiz_ended', ${JSON.stringify({
              timestamp: new Date().toISOString(),
              reason: 'host_ended'
            })})
          `;

          console.log(`host-controls - Quiz ended: ${sessionId}`);

          return {
            success: true,
            message: "Quiz ended successfully"
          };
        } catch (error) {
          console.error("Error ending quiz:", error);
          return { error: "Failed to end quiz: " + error.message };
        }

      case "clear_all_teams":
        try {
          // Delete all teams and unassign players
          await sql`UPDATE players SET team_id = NULL`;
          await sql`DELETE FROM teams`;
          
          return {
            success: true,
            message: "All teams have been cleared successfully"
          };
        } catch (error) {
          console.error("Error clearing all teams:", error);
          return { error: "Failed to clear all teams: " + error.message };
        }

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
