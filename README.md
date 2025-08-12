# La Mathil Quiz Fizz 🎯

A modern Bingo game built with React, Vite, and Turso database, featuring real-time gameplay, trivia questions, and multiple game modes.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/chrisdev1187/La-Mathil-Quiz-Fizz.git
   cd La-Mathil-Quiz-Fizz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Frontend: `http://localhost:5174/` (or port shown by Vite)
   - Backend API: `http://localhost:3001/`

## 🏗️ Architecture

- **Frontend**: React + Vite
- **Backend**: Express.js with Turso (libSQL/SQLite)
- **Database**: Turso cloud database
- **Deployment**: Vercel (serverless)

## 🎮 Features

- **Bingo Game**: Classic 5x5 bingo with automatic win detection
- **Multiple Modes**: Standard (auto-prize) and Manual (host-controlled)
- **Real-time Updates**: Live ball drawing and player interactions
- **Trivia Integration**: Custom questions with timed answers
- **Session Management**: Multiple concurrent games
- **Winner Tracking**: Line and full card prize management

## 📊 Database Schema

The application uses Turso (libSQL) with the following main tables:
- `game_sessions`: Game state and configuration
- `players`: Player information and bingo cards
- `game_events`: Event logging and history
- `trivia_questions`: Custom trivia content
- `player_answers`: Player response tracking

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start backend server only
- `npm run client` - Start frontend only

### Database Operations

- `npm run db:setup-turso` - Initialize Turso database schema
- `npm run db:export` - Export data from SQLite to CSV
- `npm run db:import` - Import CSV data to Turso
- `npm run db:validate` - Validate data migration

## 🌐 Deployment

The application is configured for Vercel deployment with:
- Serverless API functions
- Static frontend assets
- Environment variable configuration
- Automatic builds on Git push

## 📝 Migration History

This project was migrated from a legacy SQLite system to Turso, including:
- Complete database schema translation
- Stored procedure logic moved to application layer
- Data migration with validation
- Serverless architecture adaptation

---

**Last Updated**: August 12, 2025 - 19:15 UTC  
**Deployment Status**: Ready for Vercel deployment  
**Repository**: Fresh clean state with all fixes applied