import { createClient } from '@libsql/client';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

async function checkSchema() {
  try {
    console.log('🔍 Checking Turso database schema...');
    
    // Get table info
    const tables = ['game_sessions', 'players', 'game_events', 'trivia_questions', 'player_answers'];
    
    for (const table of tables) {
      console.log(`\n📋 Table: ${table}`);
      try {
        const result = await client.execute({ sql: `PRAGMA table_info(${table})` });
        console.log('Columns:');
        result.rows.forEach(row => {
          console.log(`  - ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
        });
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

checkSchema();
