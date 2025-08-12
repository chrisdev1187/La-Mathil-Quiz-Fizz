#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Turso Migration Process...\n');

// Check if environment variables are set
function checkEnvironment() {
  console.log('🔍 Checking environment variables...');
  
  const requiredVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables in your .env file or environment.');
    console.error('See TURSO_MIGRATION_GUIDE.md for instructions.');
    process.exit(1);
  }
  
  console.log('✅ Environment variables configured\n');
}

// Check if SQLite database exists
function checkSQLiteDatabase() {
  console.log('🔍 Checking SQLite database...');
  
  const dbPath = path.join(process.cwd(), 'quiz_fizz.db');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ SQLite database not found at:', dbPath);
    console.error('Please ensure you have a valid quiz_fizz.db file.');
    process.exit(1);
  }
  
  console.log('✅ SQLite database found\n');
}

// Run a command and handle errors
function runCommand(command, description) {
  try {
    console.log(`🔄 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Main migration function
async function migrateToTurso() {
  try {
    // Step 1: Environment check
    checkEnvironment();
    
    // Step 2: Check SQLite database
    checkSQLiteDatabase();
    
    // Step 3: Install dependencies
    if (!runCommand('npm install', 'Installing dependencies')) {
      process.exit(1);
    }
    
    // Step 4: Setup Turso database
    if (!runCommand('npm run db:setup-turso', 'Setting up Turso database')) {
      process.exit(1);
    }
    
    // Step 5: Export data from SQLite
    if (!runCommand('npm run db:export', 'Exporting data from SQLite')) {
      process.exit(1);
    }
    
    // Step 6: Import data to Turso
    if (!runCommand('npm run db:import', 'Importing data to Turso')) {
      process.exit(1);
    }
    
    // Step 7: Validate migration
    if (!runCommand('npm run db:validate', 'Validating migration')) {
      console.error('⚠️  Validation failed. Please check the issues above.');
      console.error('You may need to manually review and fix data issues.');
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test your application: npm run dev');
    console.log('2. Deploy to Vercel: vercel --prod');
    console.log('3. Update Vercel environment variables');
    console.log('\n📖 For detailed instructions, see: TURSO_MIGRATION_GUIDE.md');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateToTurso();
