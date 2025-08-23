import { createClient } from '@libsql/client';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

async function testConnection() {
  try {
    console.log('🗄️ Testing Turso database connection...');
    
    // Test connection with a simple query
    const result = await client.execute({ sql: 'SELECT 1 as test' });
    console.log('✅ Successfully connected to Turso database');
    console.log('Result:', result.rows);
    
    // Test creating a simple table
    console.log('Testing table creation...');
    await client.execute({ 
      sql: 'CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)' 
    });
    console.log('✅ Test table created successfully');
    
    // Test inserting data
    await client.execute({
      sql: 'INSERT OR REPLACE INTO test_table (id, name) VALUES (?, ?)',
      args: [1, 'test']
    });
    console.log('✅ Test data inserted successfully');
    
    // Test querying data
    const queryResult = await client.execute({ sql: 'SELECT * FROM test_table' });
    console.log('✅ Test query successful:', queryResult.rows);
    
    // Clean up
    await client.execute({ sql: 'DROP TABLE test_table' });
    console.log('✅ Test table cleaned up');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

// Execute the test
testConnection().catch(error => {
  console.error("FATAL: Connection test failed:", error);
  process.exit(1);
});
