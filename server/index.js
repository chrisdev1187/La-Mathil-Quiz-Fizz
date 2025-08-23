import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import API routes
import hostControls from './routes/host-controls.js';
import gameState from './routes/get-game-state.js';
import joinGame from './routes/join-game.js';
import drawBall from './routes/draw-ball.js';
import updatePlayerCard from './routes/update-player-card.js';
import teams from './routes/teams.js';
import playerAnswers from './routes/player-answers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/host-controls', hostControls);
app.use('/api/get-game-state', gameState);
app.use('/api/join-game', joinGame);
app.use('/api/draw-ball', drawBall);
app.use('/api/update-player-card', updatePlayerCard);
app.use('/api/teams', teams);
app.use('/api/player-answers', playerAnswers);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const startServer = (port) => {
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
    }
  });
};

startServer(PORT);
