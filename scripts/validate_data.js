import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Turso Client Initialization
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Function to read CSV file and count rows
function countCSVRows(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    return data.length;
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return 0;
  }
}

// Function to get row count from Turso
async function getTursoRowCount(tableName) {
  try {
    const result = await client.execute({ sql: `SELECT COUNT(*) as count FROM ${tableName}` });
    return result.rows[0].count;
  } catch (error) {
    console.error(`Error getting row count for ${tableName}:`, error);
    return 0;
  }
}

// Function to validate specific table data
async function validateTableData(tableName) {
  console.log(`\n🔍 Validating ${tableName} table...`);
  
  // Get CSV row count
  const csvFile = path.join(process.cwd(), `${tableName}_export.csv`);
  const csvCount = countCSVRows(csvFile);
  
  // Get Turso row count
  const tursoCount = await getTursoRowCount(tableName);
  
  console.log(`  📊 CSV file: ${csvCount} rows`);
  console.log(`  🗄️  Turso DB: ${tursoCount} rows`);
  
  if (csvCount === tursoCount) {
    console.log(`  ✅ ${tableName}: Row counts match!`);
    return true;
  } else {
    console.log(`  ❌ ${tableName}: Row count mismatch!`);
    return false;
  }
}

// Function to validate data integrity
async function validateDataIntegrity() {
  try {
    console.log('🗄️ Connecting to Turso database for validation...');
    
    // Test connection
    await client.execute({ sql: 'SELECT 1' });
    console.log('✅ Successfully connected to Turso database');

    const tables = [
      'game_sessions',
      'players', 
      'game_events',
      'trivia_questions',
      'player_answers'
    ];

    let allValid = true;
    const validationResults = {};

    // Validate each table
    for (const table of tables) {
      const isValid = await validateTableData(table);
      validationResults[table] = isValid;
      if (!isValid) allValid = false;
    }

    // Additional integrity checks
    console.log('\n🔍 Performing additional integrity checks...');
    
    // Check foreign key relationships
    try {
      const sessionCount = await getTursoRowCount('game_sessions');
      const playerCount = await getTursoRowCount('players');
      const eventCount = await getTursoRowCount('game_events');
      
      console.log(`  📊 Total sessions: ${sessionCount}`);
      console.log(`  📊 Total players: ${playerCount}`);
      console.log(`  📊 Total events: ${eventCount}`);
      
      // Check for orphaned records
      const orphanedPlayers = await client.execute({ 
        sql: 'SELECT COUNT(*) as count FROM players p LEFT JOIN game_sessions gs ON p.session_id = gs.id WHERE gs.id IS NULL' 
      });
      
      const orphanedEvents = await client.execute({ 
        sql: 'SELECT COUNT(*) as count FROM game_events ge LEFT JOIN game_sessions gs ON ge.session_id = gs.id WHERE gs.id IS NULL' 
      });
      
      console.log(`  🔗 Orphaned players: ${orphanedPlayers.rows[0].count}`);
      console.log(`  🔗 Orphaned events: ${orphanedEvents.rows[0].count}`);
      
      if (orphanedPlayers.rows[0].count > 0 || orphanedEvents.rows[0].count > 0) {
        console.log(`  ⚠️  Found orphaned records - data integrity issues detected`);
        allValid = false;
      } else {
        console.log(`  ✅ No orphaned records found`);
      }
      
    } catch (error) {
      console.error('Error during integrity checks:', error);
      allValid = false;
    }

    // Summary
    console.log('\n📋 Validation Summary:');
    console.log('=====================');
    
    for (const [table, isValid] of Object.entries(validationResults)) {
      const status = isValid ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${table}: ${status}`);
    }
    
    if (allValid) {
      console.log('\n🎉 All validations passed! Data migration was successful.');
    } else {
      console.log('\n⚠️  Some validations failed. Please review the issues above.');
    }

    return allValid;

  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

// Execute the validation function
validateDataIntegrity().catch(error => {
  console.error("FATAL: Validation failed:", error);
  process.exit(1);
});
