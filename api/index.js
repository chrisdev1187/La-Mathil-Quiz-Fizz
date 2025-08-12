import express from 'express';
import cors from 'cors';

// Import API routes
import hostControls from '../server/routes/host-controls.js';
import gameState from '../server/routes/get-game-state.js';
import joinGame from '../server/routes/join-game.js';
import drawBall from '../server/routes/draw-ball.js';
import updatePlayerCard from '../server/routes/update-player-card.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/host-controls', hostControls);
app.use('/api/get-game-state', gameState);
app.use('/api/join-game', joinGame);
app.use('/api/draw-ball', drawBall);
app.use('/api/update-player-card', updatePlayerCard);

// Export for Vercel
export default app;
