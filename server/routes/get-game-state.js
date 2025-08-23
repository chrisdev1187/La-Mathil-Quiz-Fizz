import express from 'express';
import sql from '../database.js';

const router = express.Router();

async function handler({ gameId, playerId, action }) {
  if (!gameId && action !== "get-winner-history") {
    return { error: "Game ID is required" };
  }

  try {
    // Handle winner history request
    if (action === "get-winner-history") {
      if (!gameId) {
        return { error: "Game ID is required for winner history" };
      }

      console.log("get-game-state - Fetching winner history for gameId:", gameId);

      const session = await sql`
        SELECT id FROM game_sessions WHERE game_id = ${gameId}
      `;

      if (session.length === 0) {
        console.log("get-game-state - Game session not found for gameId:", gameId);
        return { error: "Game session not found" };
      }

      const sessionId = session[0].id;
      console.log("get-game-state - Found session ID:", sessionId);

      // Get all winner_announced events for this session
      const winnerEvents = await sql`
        SELECT event_type, event_data, created_at
        FROM game_events 
        WHERE session_id = ${sessionId} AND event_type = 'winner_announced'
        ORDER BY created_at ASC
      `;

      console.log("get-game-state - Raw winner events from database:", winnerEvents);

      const winners = winnerEvents.map((event) => ({
        type: event.event_type,
        data: event.event_data ? JSON.parse(event.event_data) : null,
        timestamp: event.created_at,
      }));

      console.log("get-game-state - Processed winners:", winners);
      console.log("get-game-state - Returning winners count:", winners.length);

      return {
        success: true,
        winners: winners,
      };
    }

    // Original get-game-state logic
    const session = await sql`
      SELECT id, game_id, status, mode, bingo_mode, current_ball, drawn_balls, 
             current_question_index, current_question_status, question_start_time, question_end_time, time_remaining,
             round_number, max_rounds, created_at, updated_at, 
             winner_nickname, previous_round_winner, line_prize_claimed, full_card_prize_claimed,
             line_winner_id, full_card_winner_id
      FROM game_sessions 
      WHERE game_id = ${gameId}
    `;

    if (session.length === 0) {
      return { error: "Game not found" };
    }

    const sessionData = session[0];
    const sessionId = sessionData.id;

    const players = await sql`
      SELECT p.id, p.nickname, p.avatar, p.status, p.wins, p.trivia_points, p.marked_cells, p.last_seen, p.team_id,
             t.name as team_name, t.color as team_color
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.session_id = ${sessionId}
      ORDER BY p.created_at ASC
    `;

    let currentQuestion = null;
    if (sessionData.current_question_index) {
      const questionResult = await sql`
        SELECT id, question_text as question, answers_json as answers, correct_answer_index as correct_answer, 
               time_limit_seconds as time_limit, category, difficulty, points, media_url, question_status
        FROM trivia_questions 
        WHERE id = ${sessionData.current_question_index}
      `;
      if (questionResult.length > 0) {
        currentQuestion = questionResult[0];
        currentQuestion.answers = JSON.parse(currentQuestion.answers || '[]');
      }
    }

    const recentEvents = await sql`
      SELECT event_type, event_data, created_at
      FROM game_events 
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    let playerData = null;
    if (playerId) {
      const playerResult = await sql`
        SELECT id, nickname, avatar, bingo_card, marked_cells, wins, trivia_points, status
        FROM players 
        WHERE id = ${playerId} AND session_id = ${sessionId}
      `;
      if (playerResult.length > 0) {
        playerData = playerResult[0];
      }
    }

    return {
      success: true,
      session: {
        id: sessionData.id,
        gameId: sessionData.game_id,
        status: sessionData.status,
        mode: sessionData.mode,
        bingoMode: sessionData.bingo_mode,
        currentBall: sessionData.current_ball,
        drawnBalls: JSON.parse(sessionData.drawn_balls || '[]'),
        currentQuestionIndex: sessionData.current_question_index,
        currentQuestionStatus: sessionData.current_question_status,
        questionStartTime: sessionData.question_start_time,
        questionEndTime: sessionData.question_end_time,
        timeRemaining: sessionData.time_remaining,
        roundNumber: sessionData.round_number,
        maxRounds: sessionData.max_rounds,
        createdAt: sessionData.created_at,
        updatedAt: sessionData.updated_at,
        winnerNickname: sessionData.winner_nickname,
        previousRoundWinner: sessionData.previous_round_winner,
        linePrizeClaimed: sessionData.line_prize_claimed,
        fullCardPrizeClaimed: sessionData.full_card_prize_claimed,
        lineWinnerId: sessionData.line_winner_id,
        fullCardWinnerId: sessionData.full_card_winner_id,
      },
      players: players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        status: player.status,
        wins: player.wins,
        triviaPoints: player.trivia_points,
        markedCells: JSON.parse(player.marked_cells || '[]'),
        lastSeen: player.last_seen,
        teamId: player.team_id,
        teamName: player.team_name,
        teamColor: player.team_color,
      })),
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            question: currentQuestion.question,
            answers: currentQuestion.answers,
            correctAnswer: currentQuestion.correct_answer,
            timeLimit: currentQuestion.time_limit,
            category: currentQuestion.category,
            difficulty: currentQuestion.difficulty,
            points: currentQuestion.points,
            mediaUrl: currentQuestion.media_url,
            status: currentQuestion.question_status,
          }
        : null,
      recentEvents: recentEvents.map((event) => ({
        type: event.event_type,
        data: event.event_data ? JSON.parse(event.event_data) : null,
        timestamp: event.created_at,
      })),
      player: playerData
        ? {
            id: playerData.id,
            nickname: playerData.nickname,
            avatar: playerData.avatar,
            bingoCard: JSON.parse(playerData.bingo_card || '[]'),
            markedCells: JSON.parse(playerData.marked_cells || '[]'),
            wins: playerData.wins,
            triviaPoints: playerData.trivia_points,
            status: playerData.status,
          }
        : null,
    };
  } catch (error) {
    return { error: "Failed to get game state: " + error.message };
  }
}

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;