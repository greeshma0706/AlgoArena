const { v4: uuidv4 } = require('uuid');

// In-memory store for all rooms
const rooms = new Map();

// Auto-cleanup interval: delete rooms older than 2 hours
setInterval(() => {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (now - room.createdAt > TWO_HOURS) {
      rooms.delete(id);
      console.log(`[Rooms] Auto-deleted expired room: ${id}`);
    }
  }
}, 60 * 1000); // Check every minute

/**
 * Generate a short 6-character room code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new room with the first player
 */
function createRoom(playerName, problem) {
  let id = generateRoomCode();
  // Ensure uniqueness
  while (rooms.has(id)) {
    id = generateRoomCode();
  }

  const room = {
    id,
    status: 'waiting', // waiting | countdown | racing | finished
    problem,
    players: [
      {
        id: null, // socket id assigned on join
        name: playerName,
        code: problem?.starterCode || '',
        ready: false,
        finished: false,
        finishTime: null,
        passed: 0,
        total: 0,
      },
    ],
    startTime: null,
    winner: null,
    createdAt: Date.now(),
  };

  rooms.set(id, room);
  console.log(`[Rooms] Created room ${id} by ${playerName}`);
  return room;
}

/**
 * Get a room by its ID
 */
function getRoom(id) {
  return rooms.get(id) || null;
}

/**
 * Add a second player to an existing room
 */
function joinRoom(roomId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.players.length >= 2) return null;
  if (room.status !== 'waiting') return null;

  room.players.push({
    id: null,
    name: playerName,
    code: room.problem?.starterCode || '',
    ready: false,
    finished: false,
    finishTime: null,
    passed: 0,
    total: 0,
  });

  console.log(`[Rooms] ${playerName} joined room ${roomId}`);
  return room;
}

/**
 * Remove a player from a room by socket id
 */
function removePlayerBySocketId(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex((p) => p.id === socketId);
    if (playerIndex !== -1) {
      const playerName = room.players[playerIndex].name;
      room.players.splice(playerIndex, 1);
      console.log(`[Rooms] ${playerName} left room ${roomId}`);

      // If room is empty, delete it
      if (room.players.length === 0) {
        rooms.delete(roomId);
        console.log(`[Rooms] Deleted empty room ${roomId}`);
        return { roomId, playerName, roomDeleted: true };
      }

      // Reset room to waiting if game was in progress
      if (room.status === 'racing' || room.status === 'countdown') {
        room.status = 'waiting';
      }

      return { roomId, playerName, roomDeleted: false, room };
    }
  }
  return null;
}

/**
 * Get sanitized room data (safe to send to clients)
 */
function getRoomData(room) {
  if (!room) return null;
  return {
    id: room.id,
    status: room.status,
    players: room.players.map((p) => ({
      name: p.name,
      ready: p.ready,
      finished: p.finished,
      finishTime: p.finishTime,
      passed: p.passed,
      total: p.total,
    })),
    problem: room.problem
      ? {
          title: room.problem.title,
          difficulty: room.problem.difficulty,
          topic: room.problem.topic,
        }
      : null,
    winner: room.winner,
    startTime: room.startTime,
  };
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  removePlayerBySocketId,
  getRoomData,
};
