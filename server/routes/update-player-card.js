import express from 'express';
import sql from '../database.js';

const router = express.Router();

async function handler({ playerId, markedCells, gameId }) {
  if (!playerId || !markedCells || !gameId) {
    return { error: "Player ID, marked cells, and game ID are required" };
  }

  try {
    const player = await sql`
      SELECT p.id, p.session_id, p.bingo_card, p.marked_cells, p.wins, p.nickname,
             s.drawn_balls, s.status, s.bingo_mode, s.line_prize_claimed, s.full_card_prize_claimed,
             s.line_winner_id, s.full_card_winner_id, s.round_number
      FROM players p
      JOIN game_sessions s ON p.session_id = s.id
      WHERE p.id = ${playerId} AND s.game_id = ${gameId}
    `;

    if (player.length === 0) {
      return { error: "Player not found in this game" };
    }

    const playerData = player[0];
    const bingoCard = JSON.parse(playerData.bingo_card || '[]');
    const drawnBalls = JSON.parse(playerData.drawn_balls || '[]');
    const bingoMode = playerData.bingo_mode || 'standard';

    const validMarkedCells = [];
    for (const cellIndex of markedCells) {
      const index = parseInt(cellIndex);
      if (index >= 0 && index < 25) {
        const cellValue = bingoCard[index];
        if (cellValue === 0 || drawnBalls.includes(cellValue)) {
          validMarkedCells.push(cellIndex);
        }
      }
    }

    // Check for different types of wins
    const winResults = checkForBingoWins(validMarkedCells);
    const currentMarkedCells = JSON.parse(playerData.marked_cells || '[]');
    
    let newWins = playerData.wins;
    let winType = null;
    let shouldAnnounce = false;
    let prizeClaimed = false;

    // Only handle automatic prize claiming in Standard mode
    if (bingoMode === 'standard') {
      // Handle line wins (2nd prize)
      if (winResults.hasLine && !currentMarkedCells.includes("LINE_WIN")) {
        // Check if line prize is already claimed
        if (!playerData.line_prize_claimed) {
          validMarkedCells.push("LINE_WIN");
          winType = "line";
          prizeClaimed = true;
          
          // Update session to mark line prize as claimed
          await sql`
            UPDATE game_sessions 
            SET line_prize_claimed = TRUE, line_winner_id = ${playerId}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${playerData.session_id}
          `;
          
          // Auto-announce only in standard mode
          shouldAnnounce = true;
        }
      }
      
      // Handle full card wins (1st prize)
      if (winResults.hasFullCard && !currentMarkedCells.includes("FULL_CARD_WIN")) {
        // Check if full card prize is already claimed
        if (!playerData.full_card_prize_claimed) {
          validMarkedCells.push("FULL_CARD_WIN");
          winType = "full_card";
          prizeClaimed = true;
          newWins = playerData.wins + 1;
          
          // Update session to mark full card prize as claimed
          await sql`
            UPDATE game_sessions 
            SET full_card_prize_claimed = TRUE, full_card_winner_id = ${playerId}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${playerData.session_id}
          `;
          
          // Always announce full card wins
          shouldAnnounce = true;
        }
      }

      // Log win events only if prize was actually claimed (Standard mode only)
      if (winType && prizeClaimed) {
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${playerData.session_id}, 'winner_announced', ${JSON.stringify({
          playerId: playerId,
          nickname: playerData.nickname,
          winType: winType,
          bingoMode: bingoMode,
          prizeClaimed: prizeClaimed,
          roundNumber: playerData.round_number,
          markedCells: validMarkedCells,
          timestamp: new Date().toISOString(),
        })})
        `;
      }
    }
    // In Manual mode: No automatic prize claiming, no winner events, no announcements
    // Players just mark their cards and wait for host to manually announce winners

    await sql`
      UPDATE players 
      SET marked_cells = ${JSON.stringify(validMarkedCells)}, 
          wins = ${newWins},
          last_seen = CURRENT_TIMESTAMP
      WHERE id = ${playerId}
    `;

    return {
      success: true,
      player: {
        id: playerId,
        markedCells: validMarkedCells,
        wins: newWins,
        hasLine: winResults.hasLine,
        hasFullCard: winResults.hasFullCard,
        winType: winType,
        shouldAnnounce: shouldAnnounce,
        prizeClaimed: prizeClaimed,
      },
      validatedCells: validMarkedCells.length,
      invalidCells: markedCells.length - validMarkedCells.length,
    };
  } catch (error) {
    return { error: "Failed to update player card: " + error.message };
  }
}

function checkForBingoWins(markedCells) {
  const marked = new Set(markedCells.map((cell) => parseInt(cell)));

  const linePatterns = [
    [0, 1, 2, 3, 4],   // Row 1
    [5, 6, 7, 8, 9],   // Row 2
    [10, 11, 12, 13, 14], // Row 3
    [15, 16, 17, 18, 19], // Row 4
    [20, 21, 22, 23, 24], // Row 5
    [0, 5, 10, 15, 20],   // Column 1
    [1, 6, 11, 16, 21],   // Column 2
    [2, 7, 12, 17, 22],   // Column 3
    [3, 8, 13, 18, 23],   // Column 4
    [4, 9, 14, 19, 24],   // Column 5
    [0, 6, 12, 18, 24],   // Diagonal 1
    [4, 8, 12, 16, 20],   // Diagonal 2
  ];

  // Check for line wins
  let hasLine = false;
  for (const pattern of linePatterns) {
    if (pattern.every((index) => marked.has(index))) {
      hasLine = true;
      break;
    }
  }

  // Check for full card win (all 25 cells marked)
  const hasFullCard = marked.size >= 25;

  return {
    hasLine,
    hasFullCard,
  };
}

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;
