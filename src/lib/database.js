import Database from 'better-sqlite3';
import path from 'path';

// Database path - store in project root (use absolute path to avoid relative path issues)
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'quiz_fizz.db');

// Create database connection
const db = new Database(dbPath);
console.log(`🗄️ Database connected (src/lib/database.js) at: ${dbPath}`);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// SQLite query helper that mimics postgres template literal syntax
function sql(strings, ...values) {
  const query = strings.reduce((acc, string, index) => {
    return acc + string + (values[index] !== undefined ? '?' : '');
  }, '');
  
  const params = values.filter(v => v !== undefined);
  
  try {
    const stmt = db.prepare(query);
    
    // Determine if it's a SELECT or modification query
    const trimmedQuery = query.trim().toUpperCase();
    
    if (trimmedQuery.startsWith('SELECT') || trimmedQuery.startsWith('WITH')) {
      const result = stmt.all(...params);
      return Promise.resolve(result);
    } else if (trimmedQuery.includes('RETURNING')) {
      const result = stmt.all(...params);
      return Promise.resolve(result);
    } else {
      const result = stmt.run(...params);
      const arrayResult = [];
      arrayResult.insertId = result.lastInsertRowid;
      arrayResult.changes = result.changes;
      return Promise.resolve(arrayResult);
    }
  } catch (error) {
    console.error('SQL Error:', error.message);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
}

// Transaction helper
sql.transaction = (queries) => {
  const transaction = db.transaction(() => {
    for (const query of queries) {
      if (typeof query === 'function') {
        query();
      } else {
        db.prepare(query).run();
      }
    }
  });
  return transaction();
};

// Close database connection
sql.end = () => {
  db.close();
};

export default sql;
