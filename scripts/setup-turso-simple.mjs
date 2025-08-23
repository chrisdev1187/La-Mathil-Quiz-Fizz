import { createClient } from '@libsql/client';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

async function setupTursoDatabase() {
  try {
    console.log('🗄️ Connecting to Turso database...');
    
    // Test connection
    await client.execute({ sql: 'SELECT 1' });
    console.log('✅ Successfully connected to Turso database');

    console.log("Setting up database schema...");
    
    // Create tables one by one
    const createTables = [
      `CREATE TABLE IF NOT EXISTS game_sessions (
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

      `CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#FFD700',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        UNIQUE(session_id, name)
      )`,

      `CREATE TABLE IF NOT EXISTS players (
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

      `CREATE TABLE IF NOT EXISTS game_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS trivia_questions (
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

      `CREATE TABLE IF NOT EXISTS player_answers (
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

    // Create tables
    for (const createTable of createTables) {
      await client.execute({ sql: createTable });
      console.log('✅ Table created');
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
      console.log('✅ Index created');
    }

    // Insert sample trivia questions
    const sampleQuestions = [
      ['What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 2, 15],
      ['Which planet is known as the Red Planet?', '["Venus", "Mars", "Jupiter", "Saturn"]', 1, 15],
      ['What is 2 + 2?', '["3", "4", "5", "6"]', 1, 10],
      ['Who painted the Mona Lisa?', '["Van Gogh", "Picasso", "Da Vinci", "Monet"]', 2, 15],
      ['What is the largest ocean on Earth?', '["Atlantic", "Pacific", "Indian", "Arctic"]', 1, 15]
    ];

    for (const [question, answers, correct, timeLimit] of sampleQuestions) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO trivia_questions (question_text, answers_json, correct_answer_index, time_limit_seconds) VALUES (?, ?, ?, ?)',
        args: [question, answers, correct, timeLimit]
      });
    }
    console.log('✅ Sample trivia questions inserted');

    console.log('✅ Database schema created successfully!');

    console.log('📊 Database statistics:');

    // Show some stats
    const tables = ['game_sessions', 'players', 'game_events', 'trivia_questions', 'player_answers'];
    for (const table of tables) {
      const result = await client.execute({ sql: `SELECT COUNT(*) as count FROM ${table}` });
      const count = result.rows[0].count;
      console.log(`  - ${table}: ${count} records`);
    }

  } catch (error) {
    console.error('❌ Error setting up Turso database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

// Execute the setup function
setupTursoDatabase().catch(error => {
  console.error("FATAL: Turso database setup failed during execution:", error);
  process.exit(1);
});
