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
        bingo_mode TEXT DEFAULT 'standard', /* New column: 'standard' or 'manual' */
        round_number INTEGER DEFAULT 1,
        max_rounds INTEGER DEFAULT 10,
        current_ball INTEGER,
        drawn_balls TEXT DEFAULT '[]',
        questions_json TEXT DEFAULT '[]',
        current_question_index INTEGER DEFAULT 0,
        previous_round_winner TEXT, /* New column for previous round winner's nickname */
        winner_nickname TEXT, /* New column for announced winner's nickname */
        line_prize_claimed BOOLEAN DEFAULT FALSE, /* Track if line prize has been claimed */
        full_card_prize_claimed BOOLEAN DEFAULT FALSE, /* Track if full card prize has been claimed */
        line_winner_id INTEGER, /* Track who won the line prize */
        full_card_winner_id INTEGER, /* Track who won the full card prize */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create players table
      CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          nickname TEXT NOT NULL,
          avatar TEXT DEFAULT 'high-roller',
          status TEXT DEFAULT 'active',
          wins INTEGER DEFAULT 0,
          bingo_card TEXT DEFAULT '[]',
          marked_cells TEXT DEFAULT '[]',
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
          UNIQUE(session_id, nickname) /* Ensure nickname uniqueness per session */
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
          media_url TEXT,
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
          answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_correct BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES trivia_questions(id) ON DELETE CASCADE
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
      CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id);
      CREATE INDEX IF NOT EXISTS idx_trivia_questions_session_id ON trivia_questions(session_id);
    `);
    console.log('✅ Database schema created successfully!');

    // Insert sample trivia questions
    const sampleQuestions = [
      {
        question: "What is the capital of France?",
        answers: ["London", "Berlin", "Paris", "Madrid"],
        correct_answer: 2,
        time_limit: 15
      },
      {
        question: "Which planet is known as the Red Planet?",
        answers: ["Venus", "Mars", "Jupiter", "Saturn"],
        correct_answer: 1,
        time_limit: 15
      },
      {
        question: "What is 2 + 2?",
        answers: ["3", "4", "5", "6"],
        correct_answer: 1,
        time_limit: 10
      },
      {
        question: "Who painted the Mona Lisa?",
        answers: ["Van Gogh", "Picasso", "Da Vinci", "Monet"],
        correct_answer: 2,
        time_limit: 15
      },
      {
        question: "What is the largest ocean on Earth?",
        answers: ["Atlantic", "Pacific", "Indian", "Arctic"],
        correct_answer: 1,
        time_limit: 15
      }
    ];

    const insertQuestion = db.prepare(`
      INSERT OR IGNORE INTO trivia_questions (question_text, answers_json, correct_answer_index, time_limit_seconds)
      VALUES (?, ?, ?, ?)
    `);

    for (const question of sampleQuestions) {
      insertQuestion.run(
        question.question,
        JSON.stringify(question.answers),
        question.correct_answer,
        question.time_limit
      );
    }

    console.log('✅ Sample trivia questions inserted!');
    console.log('📊 Database statistics:');

    // Show some stats
    const tables = ['game_sessions', 'players', 'game_events', 'trivia_questions', 'player_answers'];
    for (const table of tables) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`  - ${table}: ${count.count} records`);
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    // Re-throw the error so the calling process knows it failed
    throw error;
  } finally {
    if (db) {
      db.close();
      console.log('Database connection closed.');
    }
  }
}

// Execute the setup function
setupDatabase().catch(error => {
  console.error("FATAL: Database setup failed during execution:", error);
  process.exit(1);
});
