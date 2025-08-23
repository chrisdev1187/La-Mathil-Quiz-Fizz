import express from 'express';
import sql from '../database.js';

const router = express.Router();

async function handler({ action, gameId, teamId, teamName, teamColor }) {
  if (!action) {
    return { error: "Action is required" };
  }

  try {
    switch (action) {
      case "list_teams":
        if (!gameId) {
          return { error: "Game ID is required" };
        }

        // Get session ID from game ID
        const session = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (session.length === 0) {
          return { error: "Game session not found" };
        }

        const sessionId = session[0].id;

        // Get all teams for this session
        const teams = await sql`
          SELECT id, name, color, created_at,
                 (SELECT COUNT(*) FROM players WHERE team_id = teams.id AND status = 'active') as player_count
          FROM teams 
          WHERE session_id = ${sessionId}
          ORDER BY created_at ASC
        `;

        return {
          success: true,
          teams: teams.map(team => ({
            id: team.id,
            name: team.name,
            color: team.color,
            playerCount: team.player_count,
            createdAt: team.created_at
          }))
        };

      case "create_team":
        if (!gameId || !teamName) {
          return { error: "Game ID and team name are required" };
        }

        // Get session ID from game ID
        const createSession = await sql`
          SELECT id FROM game_sessions WHERE game_id = ${gameId}
        `;

        if (createSession.length === 0) {
          return { error: "Game session not found" };
        }

        const createSessionId = createSession[0].id;

        // Check if team name already exists in this session
        const existingTeam = await sql`
          SELECT id FROM teams 
          WHERE session_id = ${createSessionId} AND name = ${teamName}
        `;

        if (existingTeam.length > 0) {
          return { error: "Team name already exists in this session" };
        }

        // Create new team
        const [newTeam] = await sql`
          INSERT INTO teams (session_id, name, color)
          VALUES (${createSessionId}, ${teamName}, ${teamColor || '#FFD700'})
          RETURNING id, name, color, created_at
        `;

        // Log team creation event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${createSessionId}, 'team_created', ${JSON.stringify({
            teamId: newTeam.id,
            teamName: teamName,
            teamColor: teamColor || '#FFD700',
            timestamp: new Date().toISOString(),
          })})
        `;

        return {
          success: true,
          team: {
            id: newTeam.id,
            name: newTeam.name,
            color: newTeam.color,
            playerCount: 0,
            createdAt: newTeam.created_at
          }
        };

      case "update_team":
        if (!teamId || !teamName) {
          return { error: "Team ID and team name are required" };
        }

        // Get team and session info
        const teamToUpdate = await sql`
          SELECT t.id, t.session_id, s.game_id
          FROM teams t
          JOIN game_sessions s ON t.session_id = s.id
          WHERE t.id = ${teamId}
        `;

        if (teamToUpdate.length === 0) {
          return { error: "Team not found" };
        }

        const updateSessionId = teamToUpdate[0].session_id;

        // Check if new team name already exists in this session (excluding current team)
        const duplicateTeam = await sql`
          SELECT id FROM teams 
          WHERE session_id = ${updateSessionId} AND name = ${teamName} AND id != ${teamId}
        `;

        if (duplicateTeam.length > 0) {
          return { error: "Team name already exists in this session" };
        }

        // Update team
        const [updatedTeam] = await sql`
          UPDATE teams 
          SET name = ${teamName}, color = ${teamColor || '#FFD700'}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${teamId}
          RETURNING id, name, color, created_at
        `;

        // Log team update event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${updateSessionId}, 'team_updated', ${JSON.stringify({
            teamId: teamId,
            teamName: teamName,
            teamColor: teamColor || '#FFD700',
            timestamp: new Date().toISOString(),
          })})
        `;

        return {
          success: true,
          team: {
            id: updatedTeam.id,
            name: updatedTeam.name,
            color: updatedTeam.color,
            createdAt: updatedTeam.created_at
          }
        };

      case "delete_team":
        if (!teamId) {
          return { error: "Team ID is required" };
        }

        // Get team and session info
        const teamToDelete = await sql`
          SELECT t.id, t.name, t.session_id, s.game_id
          FROM teams t
          JOIN game_sessions s ON t.session_id = s.id
          WHERE t.id = ${teamId}
        `;

        if (teamToDelete.length === 0) {
          return { error: "Team not found" };
        }

        const deleteSessionId = teamToDelete[0].session_id;
        const deletedTeamName = teamToDelete[0].name;

        // Set all players in this team to have no team (team_id = NULL)
        await sql`
          UPDATE players 
          SET team_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE team_id = ${teamId}
        `;

        // Delete the team
        await sql`
          DELETE FROM teams WHERE id = ${teamId}
        `;

        // Log team deletion event
        await sql`
          INSERT INTO game_events (session_id, event_type, event_data)
          VALUES (${deleteSessionId}, 'team_deleted', ${JSON.stringify({
            teamId: teamId,
            teamName: deletedTeamName,
            timestamp: new Date().toISOString(),
          })})
        `;

        return {
          success: true,
          message: `Team "${deletedTeamName}" deleted successfully. Players from this team are now unassigned.`
        };

      default:
        return { error: "Invalid action" };
    }
  } catch (error) {
    console.error("Teams API error:", error);
    return { error: "Failed to process team request: " + error.message };
  }
}

router.post('/', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});

export default router;
