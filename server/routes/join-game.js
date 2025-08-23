import express from 'express';
import sql from '../database.js';

const router = express.Router();

async function handler({ gameId, nickname, password, teamId, avatar = "high-roller" }) {
  if (!gameId || !nickname) {
    return { error: "Game ID and nickname are required" };
  }

  if (!password || password.length !== 4 || !/^\d{4}$/.test(password)) {
    return { error: "Password must be a 4-digit number" };
  }

  try {
    // First, find the specific session by game ID
    const session = await sql`
      SELECT id, status, mode, game_id, current_ball, drawn_balls, round_number, max_rounds
      FROM game_sessions 
      WHERE game_id = ${gameId}
    `;

    if (session.length === 0) {
      return {
        error:
          "Game session not found. Please check your session code.",
      };
    }

    const sessionId = session[0].id;
    const sessionStatus = session[0].status;

    // Check if session is accepting players
    if (sessionStatus !== 'waiting' && sessionStatus !== 'active') {
      return {
        error: "This game session is not accepting players. Status: " + sessionStatus
      };
    }

    // Check if player already exists with this nickname and session
    const existingPlayer = await sql`
      SELECT id, password_hash, bingo_card, marked_cells, wins, status, avatar, team_id
      FROM players 
      WHERE session_id = ${sessionId} AND nickname = ${nickname} AND status != 'kicked'
    `;

    if (existingPlayer.length > 0) {
      // Player exists - check password for reconnection
      const player = existingPlayer[0];
      
      if (player.password_hash !== password) {
        return { error: "Invalid password. Please use the same 4-digit password you used when you first joined this session." };
      }

      // Update last_seen timestamp and team for reconnection
      let updateQuery = `
        UPDATE players 
        SET last_seen = CURRENT_TIMESTAMP, status = 'active'`;
      
      const updateParams = [player.id];
      
      // Update team if provided
      if (teamId !== undefined) {
        updateQuery += `, team_id = $${updateParams.length + 1}`;
        updateParams.push(teamId);
      }
      
      updateQuery += ` WHERE id = $1`;
      
      await sql.unsafe(updateQuery, updateParams);

      // Log reconnection event
      await sql`
        INSERT INTO game_events (session_id, event_type, event_data)
        VALUES (${sessionId}, 'player_reconnected', ${JSON.stringify({
          playerId: player.id,
          nickname: nickname,
          timestamp: new Date().toISOString(),
        })})
      `;

      const playerCount = await sql`
        SELECT COUNT(*) as count FROM players 
        WHERE session_id = ${sessionId} AND status = 'active'
      `;

      return {
        success: true,
        reconnected: true,
        player: {
          id: player.id,
          nickname: nickname,
          avatar: player.avatar,
          bingoCard: JSON.parse(player.bingo_card || '[]'),
          wins: player.wins,
          status: 'active',
          markedCells: JSON.parse(player.marked_cells || '[]'),
          teamId: teamId !== undefined ? teamId : player.team_id,
        },
        session: {
          id: sessionId,
          gameId: session[0].game_id,
          status: session[0].status,
          mode: session[0].mode,
          playerCount: parseInt(playerCount[0].count),
          currentBall: session[0].current_ball,
          drawnBalls: JSON.parse(session[0].drawn_balls || '[]'),
          roundNumber: session[0].round_number,
          maxRounds: session[0].max_rounds,
        },
      };
    }

    // Check if max rounds reached for new players
    if (session[0].round_number > session[0].max_rounds) {
      return { error: "Maximum rounds reached for this session" };
    }

    // Create new player
    const bingoCard = generateBingoCard();

    const [player] = await sql`
      INSERT INTO players (session_id, nickname, password_hash, team_id, avatar, bingo_card, status)
      VALUES (${sessionId}, ${nickname}, ${password}, ${teamId || null}, ${avatar}, ${JSON.stringify(bingoCard)}, 'active')
      RETURNING id, nickname, avatar, bingo_card, wins, status, created_at, marked_cells, team_id
    `;

    // Persist a lightweight card fingerprint event for host diagnostics
    try {
      const hash = (JSON.stringify(bingoCard) || "").split("").reduce((h, ch) => ((h * 31 + ch.charCodeAt(0)) >>> 0), 0);
      await sql`
        INSERT INTO game_events (session_id, event_type, event_data)
        VALUES (${sessionId}, 'card_assigned', ${JSON.stringify({
          playerId: player.id,
          nickname,
          cardHash: hash >>> 0,
          timestamp: new Date().toISOString(),
        })})
      `;
    } catch {}

    await sql`
      INSERT INTO game_events (session_id, event_type, event_data)
      VALUES (${sessionId}, 'player_joined', ${JSON.stringify({
      playerId: player.id,
      nickname: nickname,
      avatar: avatar,
      timestamp: new Date().toISOString(),
    })})
    `;

    const playerCount = await sql`
      SELECT COUNT(*) as count FROM players 
      WHERE session_id = ${sessionId} AND status = 'active'
    `;

    return {
      success: true,
      player: {
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        bingoCard: JSON.parse(player.bingo_card || '[]'),
        wins: player.wins,
        status: player.status,
        markedCells: JSON.parse(player.marked_cells || '[]'),
        teamId: player.team_id,
      },
      session: {
        id: sessionId,
        gameId: session[0].game_id,
        status: session[0].status,
        mode: session[0].mode,
        playerCount: parseInt(playerCount[0].count),
        currentBall: session[0].current_ball,
        drawnBalls: JSON.parse(session[0].drawn_balls || '[]'),
        roundNumber: session[0].round_number,
        maxRounds: session[0].max_rounds,
      },
    };
  } catch (error) {
    console.error("Join game error:", error);
    return { error: "Failed to join game: " + error.message };
  }
}

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

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;