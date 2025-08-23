# Turso Migration Guide for Quiz Fizz Bingo Game

This guide provides step-by-step instructions for migrating your Bingo game from SQLite (better-sqlite3) to Turso, a serverless SQLite database service.

## Overview

The migration involves:
1. **Schema Translation**: Converting SQLite schema to Turso-compatible libSQL/SQLite
2. **Code Refactoring**: Updating database client from better-sqlite3 to @libsql/client
3. **Data Migration**: Exporting data from SQLite and importing to Turso
4. **Validation**: Ensuring data integrity after migration

## Prerequisites

1. **Turso CLI**: Install the Turso CLI
   ```bash
   npm install -g @turso/cli
   ```

2. **Turso Account**: Sign up at [turso.tech](https://turso.tech) and authenticate
   ```bash
   turso auth login
   ```

## Step 1: Create Turso Database

1. **Create a new database**:
   ```bash
   npx turso db create quiz-fizz-bingo
   ```

2. **Get your database URL**:
   ```bash
   npx turso db show --url quiz-fizz-bingo
   ```

3. **Create an auth token**:
   ```bash
   npx turso db tokens create quiz-fizz-bingo
   ```

## Step 2: Configure Environment Variables

1. **Copy the environment template**:
   ```bash
   cp env.example .env
   ```

2. **Update `.env` with your Turso credentials**:
   ```env
   TURSO_DATABASE_URL=libsql://quiz-fizz-bingo-your-org.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   NODE_ENV=development
   ```

## Step 3: Install Dependencies

Update your project dependencies:
```bash
npm install
```

This will install:
- `@libsql/client`: Turso database client
- `csv-parse`: For CSV data processing during migration

## Step 4: Setup Turso Database Schema

Initialize the Turso database with the correct schema:
```bash
npm run db:setup-turso
```

This will:
- Connect to your Turso database
- Create all necessary tables and indexes
- Insert sample trivia questions

## Step 5: Export Data from SQLite

Export your existing data from the SQLite database:
```bash
npm run db:export
```

This creates CSV files:
- `game_sessions_export.csv`
- `players_export.csv`
- `game_events_export.csv`
- `trivia_questions_export.csv`
- `player_answers_export.csv`

## Step 6: Import Data to Turso

Import the exported data into Turso:
```bash
npm run db:import
```

This script will:
- Read all CSV files
- Parse and validate the data
- Insert records into Turso
- Handle data type conversions
- Preserve relationships between tables

## Step 7: Validate Migration

Verify that the migration was successful:
```bash
npm run db:validate
```

This will:
- Compare row counts between CSV files and Turso
- Check for orphaned records
- Validate foreign key relationships
- Provide a detailed validation report

## Step 8: Test the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test all functionality**:
   - Create new game sessions
   - Join games as players
   - Draw balls and play bingo
   - Verify all data is persisted correctly

## Code Changes Made

### Database Client
- **Old**: `src/lib/database.js` (better-sqlite3)
- **New**: `src/lib/turso-database.js` (@libsql/client)

### Server Routes Updated
All server routes now use the new Turso client:
- `server/routes/host-controls.js`
- `server/routes/join-game.js`
- `server/routes/get-game-state.js`
- `server/routes/draw-ball.js`
- `server/routes/update-player-card.js`

### Schema Compatibility
The schema has been optimized for Turso/libSQL:
- All data types mapped to SQLite equivalents
- Indexes added for better performance
- Foreign key constraints preserved
- Sample data included

## Deployment to Vercel

1. **Update Vercel environment variables**:
   - Add `TURSO_DATABASE_URL`
   - Add `TURSO_AUTH_TOKEN`

2. **Deploy**:
   ```bash
   vercel --prod
   ```

## Troubleshooting

### Common Issues

1. **Connection Errors**:
   - Verify your `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
   - Ensure your database is accessible from your deployment region

2. **Data Import Errors**:
   - Check CSV file format and encoding
   - Verify all required columns are present
   - Review error logs for specific row issues

3. **Performance Issues**:
   - Turso has different performance characteristics than local SQLite
   - Consider adding more indexes for frequently queried columns
   - Use connection pooling for high-traffic applications

### Validation Failures

If validation fails:
1. Check the detailed error messages
2. Verify CSV files were created correctly
3. Re-run the import process
4. Contact support if issues persist

## Rollback Plan

If you need to rollback to SQLite:

1. **Restore the old database client**:
   ```bash
   git checkout HEAD~1 -- src/lib/database.js
   ```

2. **Update package.json**:
   ```bash
   npm install better-sqlite3
   npm uninstall @libsql/client csv-parse
   ```

3. **Restore environment variables**:
   ```env
   DATABASE_PATH=./quiz_fizz.db
   ```

## Support

For Turso-specific issues:
- [Turso Documentation](https://docs.turso.tech)
- [Turso Discord](https://discord.gg/turso)
- [Turso GitHub](https://github.com/tursodatabase)

## Migration Checklist

- [ ] Turso CLI installed and authenticated
- [ ] Database created and credentials obtained
- [ ] Environment variables configured
- [ ] Dependencies updated
- [ ] Schema setup completed
- [ ] Data exported from SQLite
- [ ] Data imported to Turso
- [ ] Migration validated
- [ ] Application tested
- [ ] Deployed to production
- [ ] Old SQLite files backed up

## Files Created/Modified

### New Files
- `Turso_Schema_Create.sql` - Turso-compatible schema
- `src/lib/turso-database.js` - New database client
- `scripts/setup-turso-database.mjs` - Turso setup script
- `scripts/import_data.js` - Data import script
- `scripts/validate_data.js` - Validation script
- `Export_Data.sql` - Data export script
- `TURSO_MIGRATION_GUIDE.md` - This guide

### Modified Files
- `package.json` - Updated dependencies and scripts
- `env.example` - Updated environment variables
- All server route files - Updated database imports

### Migration Scripts
- `npm run db:setup-turso` - Setup Turso database
- `npm run db:export` - Export SQLite data
- `npm run db:import` - Import data to Turso
- `npm run db:validate` - Validate migration
