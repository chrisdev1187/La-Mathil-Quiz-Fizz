# Quiz Fizz Bingo Game

A real-time multiplayer Bingo game built with React, Express, and Turso (serverless SQLite).

## Features

- 🎯 Real-time multiplayer Bingo gameplay
- 🎲 Multiple game modes (standard, manual)
- 🏆 Trivia integration with questions and answers
- 👥 Player management with avatars and nicknames
- 📊 Game statistics and event tracking
- 🎨 Modern UI with TailwindCSS
- ☁️ Serverless deployment ready

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Express.js
- **Database**: Turso (serverless SQLite)
- **Deployment**: Vercel

## Quick Start

### Prerequisites

1. **Turso CLI**: Install and authenticate
   ```bash
   npm install -g @turso/cli
   turso auth login
   ```

2. **Create Turso Database**:
   ```bash
   npx turso db create quiz-fizz-bingo
   npx turso db show --url quiz-fizz-bingo
   npx turso db tokens create quiz-fizz-bingo
   ```

3. **Configure Environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Turso credentials
   ```

### Installation

```bash
npm install
npm run db:setup-turso
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start playing!

## Migration from SQLite

If you're migrating from the old SQLite setup:

```bash
npm run migrate:to-turso
```

For detailed migration instructions, see [TURSO_MIGRATION_GUIDE.md](./TURSO_MIGRATION_GUIDE.md).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:setup-turso` - Setup Turso database schema
- `npm run db:export` - Export data from SQLite
- `npm run db:import` - Import data to Turso
- `npm run db:validate` - Validate data migration
- `npm run migrate:to-turso` - Complete migration automation

## Deployment

1. **Set Vercel Environment Variables**:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

2. **Deploy**:
   ```bash
   vercel --prod
   ```

## Documentation

- [Turso Migration Guide](./TURSO_MIGRATION_GUIDE.md) - Complete migration instructions
- [Turso Documentation](https://docs.turso.tech) - Database service docs
- [Vercel Documentation](https://vercel.com/docs) - Deployment platform docs