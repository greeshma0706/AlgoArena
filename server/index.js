require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { createRoom, getRoom, getRoomData } = require('./rooms');
const { generateProblem } = require('./aiService');
const { setupSocketHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// CORS setup
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

// ─── REST API Routes ─────────────────────────────────────

/**
 * POST /api/rooms
 * Create a new room and generate problem
 */
app.post('/api/rooms', async (req, res) => {
  try {
    const { playerName, topic, difficulty } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    console.log(`[API] Creating room: ${playerName}, ${topic}, ${difficulty}`);

    // Generate problem via AI
    const problem = await generateProblem(difficulty || 'medium', topic || 'arrays');

    // Create room
    const room = createRoom(playerName, problem);

    res.json({
      roomId: room.id,
      room: getRoomData(room),
    });
  } catch (error) {
    console.error('[API] Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

/**
 * GET /api/rooms/:id
 * Get room info for validation
 */
app.get('/api/rooms/:id', (req, res) => {
  const room = getRoom(req.params.id);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    room: getRoomData(room),
    canJoin: room.players.length < 2 && room.status === 'waiting',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Socket Handlers ─────────────────────────────────────
setupSocketHandlers(io);

// ─── Start Server ────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║        🎮 AlgoArena Server 🎮            ║
  ║    Running on http://localhost:${PORT}      ║
  ╚══════════════════════════════════════════╝
  `);
});
