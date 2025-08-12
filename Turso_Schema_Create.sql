-- Turso Database Schema for Quiz Fizz Bingo Game
-- This schema is compatible with libSQL/SQLite dialect used by Turso

-- Create game_sessions table
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
  previous_round_winner TEXT,
  winner_nickname TEXT,
  line_prize_claimed BOOLEAN DEFAULT FALSE,
  full_card_prize_claimed BOOLEAN DEFAULT FALSE,
  line_winner_id INTEGER,
  full_card_winner_id INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_players_nickname_session ON players(session_id, nickname);

-- Insert sample trivia questions
INSERT OR IGNORE INTO trivia_questions (question_text, answers_json, correct_answer_index, time_limit_seconds) VALUES
  ('What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 2, 15),
  ('Which planet is known as the Red Planet?', '["Venus", "Mars", "Jupiter", "Saturn"]', 1, 15),
  ('What is 2 + 2?', '["3", "4", "5", "6"]', 1, 10),
  ('Who painted the Mona Lisa?', '["Van Gogh", "Picasso", "Da Vinci", "Monet"]', 2, 15),
  ('What is the largest ocean on Earth?', '["Atlantic", "Pacific", "Indian", "Arctic"]', 1, 15);
