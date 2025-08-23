import express from 'express';
import sql from '../database.js';

const router = express.Router();

async function handler({ action, gameId, playerId, questionId, answerIndex }) {
  if (!action) {
    return { error: "Action is required" };
  }

  try {
    switch (action) {
      case "submit_answer":
        if (!gameId || !playerId || !questionId || answerIndex === undefined) {
          return { error: "Game ID, player ID, question ID, and answer index are required" };
        }

        // Validate answer index
        if (answerIndex < 0 || answerIndex > 3) {
          return { error: "Answer index must be between 0 and 3" };
        }

        // Get session and player
        const session = await sql`
          SELECT id, current_question_index, current_question_status, question_start_time, time_remaining
          FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (session.length === 0) {
          return { error: "Game session not found" };
        }

        const sessionData = session[0];
        const sessionId = sessionData.id;

        // Check if there's an active question
        if (!sessionData.current_question_index || sessionData.current_question_status !== 'active') {
          return { error: "No active question to answer" };
        }

        // Check if the question ID matches the current question
        if (sessionData.current_question_index !== questionId) {
          return { error: "Question ID does not match current active question" };
        }

        // Get player
        const player = await sql`
          SELECT id, nickname, trivia_points
          FROM players WHERE id = ${playerId} AND session_id = ${sessionId}
        `;

        if (player.length === 0) {
          return { error: "Player not found" };
        }

        const playerData = player[0];

        // Check if player already answered this question
        const existingAnswer = await sql`
          SELECT id FROM player_answers 
          WHERE player_id = ${playerData.id} AND question_id = ${questionId}
        `;

        if (existingAnswer.length > 0) {
          return { error: "Player has already answered this question" };
        }

        // Get question details
        const question = await sql`
          SELECT id, correct_answer_index, points, time_limit_seconds
          FROM trivia_questions WHERE id = ${questionId}
        `;

        if (question.length === 0) {
          return { error: "Question not found" };
        }

        const questionData = question[0];

        // Calculate response time
        const startTime = new Date(sessionData.question_start_time);
        const answerTime = new Date();
        const responseTimeSeconds = Math.floor((answerTime - startTime) / 1000);

        // Check if time is up
        if (responseTimeSeconds > questionData.time_limit_seconds) {
          return { error: "Time is up for this question" };
        }

        // Determine if answer is correct
        const isCorrect = answerIndex === questionData.correct_answer_index;

        // Calculate points earned (bonus for fast answers)
        let pointsEarned = 0;
        if (isCorrect) {
          const timeBonus = Math.max(0, Math.floor((questionData.time_limit_seconds - responseTimeSeconds) / 2));
          pointsEarned = questionData.points + timeBonus;
        }

        // Insert answer
        const [newAnswer] = await sql`
          INSERT INTO player_answers (player_id, question_id, answer_index, is_correct, points_earned, response_time_seconds)
          VALUES (${playerData.id}, ${questionId}, ${answerIndex}, ${isCorrect}, ${pointsEarned}, ${responseTimeSeconds})
          RETURNING id, is_correct, points_earned, response_time_seconds
        `;

        // Update player's trivia points
        const newTriviaPoints = playerData.trivia_points + pointsEarned;
        await sql`
          UPDATE players 
          SET trivia_points = ${newTriviaPoints}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${playerData.id}
        `;

        // Log answer submission event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${sessionId}, 'answer_submitted', ${JSON.stringify({
            playerId: playerData.id,
            playerNickname: playerData.nickname,
            questionId: questionId,
            answerIndex: answerIndex,
            isCorrect: isCorrect,
            pointsEarned: pointsEarned,
            responseTime: responseTimeSeconds,
            totalPoints: newTriviaPoints
          })})
        `;

        return {
          success: true,
          message: "Answer submitted successfully",
          answer: {
            id: newAnswer.id,
            isCorrect: newAnswer.is_correct,
            pointsEarned: newAnswer.points_earned,
            responseTime: newAnswer.response_time_seconds,
            totalPoints: newTriviaPoints
          }
        };

      case "get_my_answers":
        if (!gameId || !playerId) {
          return { error: "Game ID and player ID are required" };
        }

        const myAnswersSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (myAnswersSession.length === 0) {
          return { error: "Game session not found" };
        }

        const myAnswersSessionId = myAnswersSession[0].id;

        // Get player's answers for this session
        const myAnswers = await sql`
          SELECT 
            pa.id,
            pa.question_id,
            pa.answer_index,
            pa.is_correct,
            pa.points_earned,
            pa.response_time_seconds,
            pa.answered_at,
            tq.question_text,
            tq.answers_json,
            tq.correct_answer_index,
            tq.points as question_points
          FROM player_answers pa
          JOIN trivia_questions tq ON pa.question_id = tq.id
          WHERE pa.player_id = ${playerId} AND tq.session_id = ${myAnswersSessionId}
          ORDER BY pa.answered_at DESC
        `;

        return {
          success: true,
          answers: myAnswers.map(answer => ({
            id: answer.id,
            questionId: answer.question_id,
            questionText: answer.question_text,
            answers: JSON.parse(answer.answers_json),
            correctAnswer: answer.correct_answer_index,
            myAnswer: answer.answer_index,
            isCorrect: answer.is_correct,
            pointsEarned: answer.points_earned,
            responseTime: answer.response_time_seconds,
            answeredAt: answer.answered_at,
            questionPoints: answer.question_points
          }))
        };

      case "get_question_stats":
        if (!gameId || !questionId) {
          return { error: "Game ID and question ID are required" };
        }

        const statsSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (statsSession.length === 0) {
          return { error: "Game session not found" };
        }

        const statsSessionId = statsSession[0].id;

        // Get question statistics
        const stats = await sql`
          SELECT 
            COUNT(*) as total_answers,
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
            AVG(response_time_seconds) as avg_response_time,
            MIN(response_time_seconds) as fastest_answer,
            MAX(points_earned) as highest_score
          FROM player_answers pa
          JOIN trivia_questions tq ON pa.question_id = tq.id
          WHERE pa.question_id = ${questionId} AND tq.session_id = ${statsSessionId}
        `;

        // Get answer distribution
        const answerDistribution = await sql`
          SELECT 
            answer_index,
            COUNT(*) as count
          FROM player_answers
          WHERE question_id = ${questionId}
          GROUP BY answer_index
          ORDER BY answer_index
        `;

        return {
          success: true,
          stats: {
            totalAnswers: stats[0].total_answers || 0,
            correctAnswers: stats[0].correct_answers || 0,
            accuracy: stats[0].total_answers > 0 ? (stats[0].correct_answers / stats[0].total_answers * 100).toFixed(1) : 0,
            avgResponseTime: stats[0].avg_response_time ? Math.round(stats[0].avg_response_time) : 0,
            fastestAnswer: stats[0].fastest_answer || 0,
            highestScore: stats[0].highest_score || 0,
            answerDistribution: answerDistribution.map(dist => ({
              answerIndex: dist.answer_index,
              count: dist.count
            }))
          }
        };

      default:
        return { error: "Unknown action" };
    }
  } catch (error) {
    console.error("Player answers error:", error);
    return { error: "Failed to execute action: " + error.message };
  }
}

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;
