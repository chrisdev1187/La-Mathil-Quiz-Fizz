import { createClient } from '@libsql/client';

console.log('🔌 Testing Turso connection...');

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

async function testConnection() {
  try {
    console.log('✅ Client created successfully');
    
    // Simple test query
    const result = await client.execute({ sql: 'SELECT 1 as test' });
    console.log('✅ Query executed successfully');
    console.log('Result:', result.rows);
    
    console.log('🎉 Connection test PASSED!');
    
  } catch (error) {
    console.error('❌ Connection test FAILED:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();
