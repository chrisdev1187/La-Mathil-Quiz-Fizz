import { createClient } from '@libsql/client';

// Turso Client Initialization
const client = createClient({
  url: "libsql://quizfizz-db-vercel-icfg-zdtyjdmxd7veyqnvo325vkxs.aws-eu-west-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQ5MjIyNzYsImlkIjoiMzVlZmU4ZjYtODBjMS00MmU3LWFkMTktOGVlMTE0MmVkNmRkIiwicmlkIjoiNjk5OGY3ZGEtZmQ0OC00NTA3LTk4NzUtMzJkZTMzYjczMmIzIn0.s0lEZGFjFQlqFWp3maFzBeLoemeeeS_SUIPhW910KWd2QBw--JTk21RxIJNeQdNWO62T54a-Z-d4Bz52qc1yCQ"
});

console.log(`🗄️ Turso database connected (server/database.js)`);

// SQLite query helper that mimics postgres template literal syntax
function sql(strings, ...values) {
  const query = strings.reduce((acc, string, index) => {
    return acc + string + (values[index] !== undefined ? '?' : '');
  }, '');
  
  const params = values.filter(v => v !== undefined);
  
  try {
    // Determine if it's a SELECT or modification query
    const trimmedQuery = query.trim().toUpperCase();
    
    if (trimmedQuery.startsWith('SELECT') || trimmedQuery.startsWith('WITH')) {
      return client.execute({ sql: query, args: params }).then(result => result.rows);
    } else if (trimmedQuery.includes('RETURNING')) {
      return client.execute({ sql: query, args: params }).then(result => result.rows);
    } else {
      return client.execute({ sql: query, args: params }).then(result => {
        const arrayResult = [];
        arrayResult.insertId = result.lastInsertRowid;
        arrayResult.changes = result.rowsAffected;
        return arrayResult;
      });
    }
  } catch (error) {
    console.error('SQL Error:', error.message);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
}

// Transaction helper
sql.transaction = async (queries) => {
  const transaction = await client.transaction();
  try {
    for (const query of queries) {
      if (typeof query === 'function') {
        await query();
      } else {
        await transaction.execute({ sql: query });
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Close database connection
sql.end = async () => {
  await client.close();
};

export default sql;
