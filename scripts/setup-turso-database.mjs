import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

// Function to run SQL
async function runSql(query) {
  try {
    return await client.execute({ sql: query });
  } catch (error) {
    console.error("Error running SQL:", query);
    throw error;
  }
}

async function setupTursoDatabase() {
  try {
    console.log('🗄️ Connecting to Turso database...');
    
    // Test connection
    await client.execute({ sql: 'SELECT 1' });
    console.log('✅ Successfully connected to Turso database');

    console.log("Setting up database schema...");
    
    // Read and execute the schema file
    const schemaPath = path.join(process.cwd(), 'Turso_Schema_Create.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await runSql(statement);
        } catch (error) {
          // Ignore errors for ALTER TABLE ADD COLUMN if column already exists
          if (error.message && error.message.includes('duplicate column name')) {
            console.log(`⚠️ Column already exists, skipping: ${statement.substring(0, 50)}...`);
          } else {
            throw error;
          }
        }
      }
    }
    
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
