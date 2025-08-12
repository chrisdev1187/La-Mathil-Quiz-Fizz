import express from 'express';
import sql from '../database.js';

const router = express.Router();

async function handler({ gameId }) {
  if (!gameId) {
    return { error: "Game ID is required" };
  }

  try {
    const session = await sql`
      SELECT id, status, drawn_balls
      FROM game_sessions 
      WHERE game_id = ${gameId}
    `;

    if (session.length === 0) {
      return { error: "Game not found" };
    }

    const sessionData = session[0];
    const sessionId = sessionData.id;

    if (sessionData.status !== "active") {
      return { error: "Game is not active" };
    }

    const drawnBalls = JSON.parse(sessionData.drawn_balls || '[]');

    if (drawnBalls.length >= 75) {
      return { error: "All balls have been drawn" };
    }

    const availableBalls = [];
    for (let i = 1; i <= 75; i++) {
      if (!drawnBalls.includes(i)) {
        availableBalls.push(i);
      }
    }

    const newBall =
      availableBalls[Math.floor(Math.random() * availableBalls.length)];
    const updatedDrawnBalls = [...drawnBalls, newBall];

    const getBallLetter = (number) => {
      if (number <= 15) return "B";
      if (number <= 30) return "I";
      if (number <= 45) return "N";
      if (number <= 60) return "G";
      return "O";
    };

    await sql`
      UPDATE game_sessions 
      SET current_ball = ${newBall}, 
          drawn_balls = ${JSON.stringify(updatedDrawnBalls)}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${sessionId}
    `;

    await sql`
      INSERT INTO game_events (session_id, event_type, event_data)
      VALUES (${sessionId}, 'ball_drawn', ${JSON.stringify({
        ball: newBall,
        letter: getBallLetter(newBall),
        display: `${getBallLetter(newBall)}-${newBall}`,
        totalDrawn: updatedDrawnBalls.length,
        remaining: 75 - updatedDrawnBalls.length,
      })})
    `;

    return {
      success: true,
      ball: {
        number: newBall,
        letter: getBallLetter(newBall),
        display: `${getBallLetter(newBall)}-${newBall}`,
      },
      gameState: {
        currentBall: newBall,
        drawnBalls: updatedDrawnBalls,
        totalDrawn: updatedDrawnBalls.length,
        remaining: 75 - updatedDrawnBalls.length,
      },
    };
  } catch (error) {
    return { error: "Failed to draw ball: " + error.message };
  }
}

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;
