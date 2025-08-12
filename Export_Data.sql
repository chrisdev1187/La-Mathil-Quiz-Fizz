-- Export Data Script for SQLite to Turso Migration
-- This script exports all data from the current SQLite database to CSV files

-- Export game_sessions table
.mode csv
.headers on
.output game_sessions_export.csv
SELECT 
  id,
  game_id,
  status,
  mode,
  bingo_mode,
  round_number,
  max_rounds,
  current_ball,
  drawn_balls,
  questions_json,
  current_question_index,
  previous_round_winner,
  winner_nickname,
  line_prize_claimed,
  full_card_prize_claimed,
  line_winner_id,
  full_card_winner_id,
  created_at,
  updated_at
FROM game_sessions;

-- Export players table
.output players_export.csv
SELECT 
  id,
  session_id,
  nickname,
  avatar,
  status,
  wins,
  bingo_card,
  marked_cells,
  last_seen,
  created_at,
  updated_at
FROM players;

-- Export game_events table
.output game_events_export.csv
SELECT 
  id,
  session_id,
  event_type,
  event_data,
  created_at
FROM game_events;

-- Export trivia_questions table
.output trivia_questions_export.csv
SELECT 
  id,
  session_id,
  question_text,
  answers_json,
  correct_answer_index,
  time_limit_seconds,
  media_url,
  created_at,
  updated_at
FROM trivia_questions;

-- Export player_answers table
.output player_answers_export.csv
SELECT 
  id,
  player_id,
  question_id,
  answer_index,
  answered_at,
  is_correct
FROM player_answers;

-- Reset output mode
.output stdout
.mode list
