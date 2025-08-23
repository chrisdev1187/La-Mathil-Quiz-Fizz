import { createClient } from '@libsql/client';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

async function recreateSchema() {
  try {
    console.log('🗄️ Recreating Turso database schema...');
    
    // Drop existing tables (in reverse dependency order)
    const dropTables = [
      'DROP TABLE IF EXISTS player_answers',
      'DROP TABLE IF EXISTS trivia_questions', 
      'DROP TABLE IF EXISTS game_events',
      'DROP TABLE IF EXISTS players',
      'DROP TABLE IF EXISTS game_sessions'
    ];
    
    for (const dropTable of dropTables) {
      await client.execute({ sql: dropTable });
      console.log('✅ Dropped table');
    }
    
    // Create tables with correct schema
    const createTables = [
      `CREATE TABLE game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'waiting',
        mode TEXT DEFAULT 'bingo',
        bingo_mode TEXT DEFAULT 'standard',
        round_number INTEGER DEFAULT 1,
        max_rounds INTEGER DEFAULT 10,
        current_ball INTEGER,
        drawn_balls TEXT DEFAULT '[]',
        questions_json TEXT DEFAULT '[]',
        current_question_index INTEGER DEFAULT 0,
        previous_round_winner TEXT,
        winner_nickname TEXT,
        line_prize_claimed BOOLEAN DEFAULT FALSE,
        full_card_prize_claimed BOOLEAN DEFAULT FALSE,
        line_winner_id INTEGER,
        full_card_winner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#FFD700',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        UNIQUE(session_id, name)
      )`,

      `CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        nickname TEXT NOT NULL,
        password TEXT,
        team_id INTEGER,
        avatar TEXT DEFAULT 'high-roller',
        status TEXT DEFAULT 'active',
        wins INTEGER DEFAULT 0,
        bingo_card TEXT DEFAULT '[]',
        marked_cells TEXT DEFAULT '[]',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
        UNIQUE(session_id, nickname)
      )`,

      `CREATE TABLE game_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE trivia_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        question_text TEXT NOT NULL,
        answers_json TEXT NOT NULL,
        correct_answer_index INTEGER NOT NULL,
        time_limit_seconds INTEGER DEFAULT 15,
        media_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE player_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER,
        question_id INTEGER,
        answer_index INTEGER,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_correct BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES trivia_questions(id) ON DELETE CASCADE
      )`
    ];
    
    for (const createTable of createTables) {
      await client.execute({ sql: createTable });
      console.log('✅ Created table');
    }
    
    // Create indexes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_trivia_questions_session_id ON trivia_questions(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_players_nickname_session ON players(session_id, nickname)'
    ];
    
    for (const createIndex of createIndexes) {
      await client.execute({ sql: createIndex });
      console.log('✅ Created index');
    }
    
    console.log('🎉 Schema recreation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error recreating schema:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

recreateSchema();
