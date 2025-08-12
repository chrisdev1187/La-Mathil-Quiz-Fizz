import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

// Function to read CSV file
function readCSV(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

// Function to convert boolean strings to actual booleans
function parseBoolean(value) {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

// Function to convert null strings to actual nulls
function parseNull(value) {
  if (value === 'NULL' || value === 'null' || value === '') return null;
  return value;
}

async function importData() {
  try {
    console.log('🗄️ Connecting to Turso database...');
    
    // Test connection
    await client.execute({ sql: 'SELECT 1' });
    console.log('✅ Successfully connected to Turso database');

    const csvDir = process.cwd();
    const tables = [
      'game_sessions',
      'players', 
      'game_events',
      'trivia_questions',
      'player_answers'
    ];

    for (const table of tables) {
      const csvFile = path.join(csvDir, `${table}_export.csv`);
      
      if (!fs.existsSync(csvFile)) {
        console.log(`⚠️  CSV file not found: ${csvFile}, skipping...`);
        continue;
      }

      console.log(`📥 Importing data from ${csvFile}...`);
      const data = readCSV(csvFile);
      
      if (data.length === 0) {
        console.log(`⚠️  No data found in ${csvFile}, skipping...`);
        continue;
      }

      // Clear existing data for this table (except trivia_questions which has sample data)
      if (table !== 'trivia_questions') {
        await client.execute({ sql: `DELETE FROM ${table}` });
        console.log(`🧹 Cleared existing data from ${table}`);
      }

      // Import data
      let importedCount = 0;
      for (const row of data) {
        try {
          // Prepare the data based on table structure
          let insertData = {};
          
          switch (table) {
            case 'game_sessions':
              insertData = {
                id: parseNull(row.id),
                game_id: row.game_id,
                status: row.status,
                mode: row.mode,
                bingo_mode: row.bingo_mode,
                round_number: parseInt(row.round_number) || 1,
                max_rounds: parseInt(row.max_rounds) || 10,
                current_ball: parseNull(row.current_ball),
                drawn_balls: row.drawn_balls || '[]',
                questions_json: row.questions_json || '[]',
                current_question_index: parseInt(row.current_question_index) || 0,
                previous_round_winner: parseNull(row.previous_round_winner),
                winner_nickname: parseNull(row.winner_nickname),
                line_prize_claimed: parseBoolean(row.line_prize_claimed),
                full_card_prize_claimed: parseBoolean(row.full_card_prize_claimed),
                line_winner_id: parseNull(row.line_winner_id),
                full_card_winner_id: parseNull(row.full_card_winner_id),
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString()
              };
              break;
              
            case 'players':
              insertData = {
                id: parseNull(row.id),
                session_id: parseInt(row.session_id),
                nickname: row.nickname,
                avatar: row.avatar || 'high-roller',
                status: row.status || 'active',
                wins: parseInt(row.wins) || 0,
                bingo_card: row.bingo_card || '[]',
                marked_cells: row.marked_cells || '[]',
                last_seen: row.last_seen || new Date().toISOString(),
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString()
              };
              break;
              
            case 'game_events':
              insertData = {
                id: parseNull(row.id),
                session_id: parseInt(row.session_id),
                event_type: row.event_type,
                event_data: row.event_data,
                created_at: row.created_at || new Date().toISOString()
              };
              break;
              
            case 'trivia_questions':
              // Only import if it's not a sample question (session_id is null for sample questions)
              if (row.session_id) {
                insertData = {
                  id: parseNull(row.id),
                  session_id: parseInt(row.session_id),
                  question_text: row.question_text,
                  answers_json: row.answers_json,
                  correct_answer_index: parseInt(row.correct_answer_index),
                  time_limit_seconds: parseInt(row.time_limit_seconds) || 15,
                  media_url: parseNull(row.media_url),
                  created_at: row.created_at || new Date().toISOString(),
                  updated_at: row.updated_at || new Date().toISOString()
                };
              } else {
                continue; // Skip sample questions
              }
              break;
              
            case 'player_answers':
              insertData = {
                id: parseNull(row.id),
                player_id: parseInt(row.player_id),
                question_id: parseInt(row.question_id),
                answer_index: parseInt(row.answer_index),
                answered_at: row.answered_at || new Date().toISOString(),
                is_correct: parseBoolean(row.is_correct)
              };
              break;
          }

          // Build INSERT statement
          const columns = Object.keys(insertData).filter(key => insertData[key] !== null);
          const values = columns.map(key => insertData[key]);
          const placeholders = columns.map(() => '?').join(', ');
          
          const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
          
          await client.execute({ sql: insertSql, args: values });
          importedCount++;
          
        } catch (error) {
          console.error(`Error importing row to ${table}:`, error);
          console.error('Row data:', row);
        }
      }
      
      console.log(`✅ Imported ${importedCount} records to ${table}`);
    }

    console.log('🎉 Data import completed successfully!');

  } catch (error) {
    console.error('❌ Error during data import:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

// Execute the import function
importData().catch(error => {
  console.error("FATAL: Data import failed:", error);
  process.exit(1);
});
