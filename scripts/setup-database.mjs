import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in project root (use absolute path to avoid relative path issues)
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'quiz_fizz.db');

// Function to run SQL
async function runSql(query) {
  try {
    // For DDL (CREATE TABLE etc.) db.exec is appropriate
    return db.exec(query);
  } catch (error) {
    console.error("Error running SQL:", query);
    throw error;
  }
}

let db;

async function setupDatabase() {
  try {
    // Explicitly delete DB file if it exists, to ensure fresh schema during setup
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`🧹 Deleted existing database file: ${dbPath}`);
    }

    // Create database connection
    db = new Database(dbPath);
    console.log(`🗄️ Database connected (scripts/setup-database.mjs) at: ${dbPath}`);

    // Enable foreign keys and WAL mode for better performance
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    console.log("Setting up database schema...");
    await runSql(`
      CREATE TABLE IF NOT EXISTS game_sessions (
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
        current_question_status TEXT DEFAULT 'inactive',
        question_start_time DATETIME,
        question_end_time DATETIME,
        time_remaining INTEGER,
        previous_round_winner TEXT,
        winner_nickname TEXT,
        line_prize_claimed BOOLEAN DEFAULT FALSE,
        full_card_prize_claimed BOOLEAN DEFAULT FALSE,
        line_winner_id INTEGER,
        full_card_winner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create teams table
      CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#FFD700',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
          UNIQUE(session_id, name)
      );

      -- Create players table
      CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          nickname TEXT NOT NULL,
          password TEXT,
          team_id INTEGER,
          avatar TEXT DEFAULT 'high-roller',
          status TEXT DEFAULT 'active',
          wins INTEGER DEFAULT 0,
          trivia_points INTEGER DEFAULT 0,
          bingo_card TEXT DEFAULT '[]',
          marked_cells TEXT DEFAULT '[]',
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
          UNIQUE(session_id, nickname)
      );

      -- Create game_events table
      CREATE TABLE IF NOT EXISTS game_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          event_type TEXT NOT NULL,
          event_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      );

      -- Create trivia_questions table
      CREATE TABLE IF NOT EXISTS trivia_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          question_text TEXT NOT NULL,
          answers_json TEXT NOT NULL,
          correct_answer_index INTEGER NOT NULL,
          time_limit_seconds INTEGER DEFAULT 15,
          category TEXT DEFAULT 'general',
          difficulty TEXT DEFAULT 'medium',
          points INTEGER DEFAULT 10,
          media_url TEXT,
          question_status TEXT DEFAULT 'inactive',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      );

      -- Create player_answers table
      CREATE TABLE IF NOT EXISTS player_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER,
          question_id INTEGER,
          answer_index INTEGER,
          is_correct BOOLEAN DEFAULT FALSE,
          points_earned INTEGER DEFAULT 0,
          response_time_seconds INTEGER,
          answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES trivia_questions(id) ON DELETE CASCADE
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
      CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
      CREATE INDEX IF NOT EXISTS idx_teams_session_id ON teams(session_id);
      CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_answers_question_id ON player_answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_trivia_questions_session_id ON trivia_questions(session_id);
      CREATE INDEX IF NOT EXISTS idx_trivia_questions_status ON trivia_questions(question_status);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_mode ON game_sessions(mode);
      CREATE INDEX IF NOT EXISTS idx_players_nickname_session ON players(session_id, nickname);
    `);

    console.log("✅ Database schema created successfully");

    // Insert sample trivia questions
    console.log("📝 Inserting sample trivia questions...");
    await runSql(`
      INSERT OR IGNORE INTO trivia_questions (question_text, answers_json, correct_answer_index, time_limit_seconds, category, difficulty, points) VALUES
        ('What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 2, 15, 'geography', 'easy', 10),
        ('Which planet is known as the Red Planet?', '["Venus", "Mars", "Jupiter", "Saturn"]', 1, 15, 'science', 'easy', 10),
        ('What is 2 + 2?', '["3", "4", "5", "6"]', 1, 10, 'math', 'easy', 5),
        ('Who painted the Mona Lisa?', '["Van Gogh", "Picasso", "Da Vinci", "Monet"]', 2, 15, 'art', 'medium', 15),
        ('What is the largest ocean on Earth?', '["Atlantic", "Pacific", "Indian", "Arctic"]', 1, 15, 'geography', 'medium', 15),
        ('Which year did World War II end?', '["1943", "1944", "1945", "1946"]', 2, 20, 'history', 'medium', 15),
        ('What is the chemical symbol for gold?', '["Ag", "Au", "Fe", "Cu"]', 1, 12, 'science', 'medium', 12),
        ('Who wrote "Romeo and Juliet"?', '["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"]', 1, 15, 'literature', 'medium', 15),
        ('What is the square root of 144?', '["10", "11", "12", "13"]', 2, 10, 'math', 'easy', 8),
        ('Which country is home to the kangaroo?', '["New Zealand", "Australia", "South Africa", "India"]', 1, 12, 'geography', 'easy', 10);
    `);

    console.log("✅ Sample trivia questions inserted successfully");

    // Test database connection and basic queries
    console.log("🧪 Testing database functionality...");
    
    const sessionCount = db.prepare("SELECT COUNT(*) as count FROM game_sessions").get();
    const questionCount = db.prepare("SELECT COUNT(*) as count FROM trivia_questions").get();
    const playerCount = db.prepare("SELECT COUNT(*) as count FROM players").get();
    
    console.log(`📊 Database test results:`);
    console.log(`   - Game sessions: ${sessionCount.count}`);
    console.log(`   - Trivia questions: ${questionCount.count}`);
    console.log(`   - Players: ${playerCount.count}`);

    console.log("🎉 Database setup completed successfully!");
    
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  } finally {
    if (db) {
      db.close();
      console.log("🔒 Database connection closed");
    }
  }
}

// Run the setup
setupDatabase().catch(console.error);
