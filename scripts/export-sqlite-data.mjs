import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Database path
const dbPath = path.join(process.cwd(), 'quiz_fizz.db');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ SQLite database not found at:', dbPath);
  process.exit(1);
}

// Create database connection
const db = new Database(dbPath);
console.log(`🗄️ Connected to SQLite database: ${dbPath}`);

// Enable foreign keys and WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Function to export table to CSV
function exportTableToCSV(tableName, query) {
  try {
    console.log(`📤 Exporting ${tableName}...`);
    
    const rows = db.prepare(query).all();
    const csvFile = `${tableName}_export.csv`;
    
    if (rows.length === 0) {
      console.log(`  ⚠️  No data in ${tableName}`);
      return;
    }
    
    // Get column names from first row
    const columns = Object.keys(rows[0]);
    
    // Create CSV content
             const csvContent = [
           columns.join(','), // Header
           ...rows.map(row => 
             columns.map(col => {
               const value = row[col];
               // Handle JSON and special characters
               if (value === null || value === undefined) return '';
               if (typeof value === 'string') {
                 // Always quote strings that contain special characters
                 if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('{') || value.includes('}')) {
                   return `"${value.replace(/"/g, '""')}"`;
                 }
               }
               return value;
             }).join(',')
           )
         ].join('\n');
    
    // Write to file
    fs.writeFileSync(csvFile, csvContent, 'utf8');
    console.log(`  ✅ Exported ${rows.length} rows to ${csvFile}`);
    
  } catch (error) {
    console.error(`  ❌ Error exporting ${tableName}:`, error.message);
  }
}

// Export all tables
const tables = [
  {
    name: 'game_sessions',
    query: 'SELECT * FROM game_sessions'
  },
  {
    name: 'players',
    query: 'SELECT * FROM players'
  },
  {
    name: 'game_events',
    query: 'SELECT * FROM game_events'
  },
  {
    name: 'trivia_questions',
    query: 'SELECT * FROM trivia_questions'
  },
  {
    name: 'player_answers',
    query: 'SELECT * FROM player_answers'
  }
];

console.log('🚀 Starting data export...\n');

for (const table of tables) {
  exportTableToCSV(table.name, table.query);
}

console.log('\n🎉 Data export completed!');
console.log('📁 CSV files created in project root directory');

// Close database
db.close();
console.log('🔌 Database connection closed');
