const { getRoom, joinRoom, removePlayerBySocketId, getRoomData } = require('./rooms');
const { getHint } = require('./aiService');
const { runCode } = require('./executor');

/**
 * Setup all socket event handlers
 */
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── room:join ─────────────────────────────────────────
    socket.on('room:join', ({ roomId, playerName }) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Find the player slot
      let player = room.players.find((p) => p.name === playerName && p.id === null);

      if (!player) {
        // Maybe this player is rejoining
        player = room.players.find((p) => p.name === playerName);
        if (player) {
          player.id = socket.id;
        } else {
          // Try to join as new player
          const updated = joinRoom(roomId, playerName);
          if (!updated) {
            socket.emit('error', { message: 'Room is full or game already started' });
            return;
          }
          player = updated.players.find((p) => p.name === playerName);
          if (player) player.id = socket.id;
        }
      } else {
        player.id = socket.id;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.playerName = playerName;

      console.log(`[Socket] ${playerName} joined room ${roomId}`);

      // Send room update to everyone
      io.to(roomId).emit('room:update', getRoomData(room));
    });

    // ─── player:ready ──────────────────────────────────────
    socket.on('player:ready', () => {
      const { roomId, playerName } = socket.data;
      if (!roomId) return;

      const room = getRoom(roomId);
      if (!room || room.status !== 'waiting') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      player.ready = true;
      console.log(`[Socket] ${playerName} is ready in room ${roomId}`);

      io.to(roomId).emit('room:update', getRoomData(room));

      // Check if both players are ready
      if (room.players.length === 2 && room.players.every((p) => p.ready)) {
        startCountdown(io, room);
      }
    });

    // ─── code:update ───────────────────────────────────────
    socket.on('code:update', ({ code }) => {
      const { roomId, playerName } = socket.data;
      if (!roomId) return;

      const room = getRoom(roomId);
      if (!room || room.status !== 'racing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.code = code;
      }

      // Forward to opponent only
      socket.to(roomId).emit('opponent:code', { playerName, code });
    });

    // ─── code:submit ───────────────────────────────────────
    socket.on('code:submit', async ({ code }) => {
      const { roomId, playerName } = socket.data;
      if (!roomId) return;

      const room = getRoom(roomId);
      if (!room || room.status !== 'racing') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player || player.finished) return;

      console.log(`[Socket] ${playerName} submitted code in room ${roomId}`);
      socket.emit('submission:running');

      try {
        const result = runCode(code, room.problem);

        player.passed = result.passed;
        player.total = result.total;
        player.code = code;

        socket.emit('submission:result', {
          passed: result.passed,
          total: result.total,
          allPassed: result.allPassed,
          results: result.results,
          error: null,
        });

        // Update room for progress bars
        io.to(roomId).emit('room:update', getRoomData(room));

        // Check if all tests passed → winner
        if (result.allPassed && !room.winner) {
          player.finished = true;
          player.finishTime = Date.now() - room.startTime;
          room.winner = playerName;
          room.status = 'finished';

          console.log(`[Socket] ${playerName} WON in room ${roomId}!`);

          io.to(roomId).emit('game:over', {
            winner: playerName,
            finishTime: player.finishTime,
            results: room.players.map((p) => ({
              name: p.name,
              passed: p.passed,
              total: p.total,
              finished: p.finished,
              finishTime: p.finishTime,
            })),
          });
        }
      } catch (error) {
        console.error(`[Socket] Execution error for ${playerName}:`, error.message);
        socket.emit('submission:result', {
          passed: 0,
          total: room.problem.testCases.length,
          allPassed: false,
          results: [],
          error: 'Internal server error during code execution',
        });
      }
    });

    // ─── hint:request ──────────────────────────────────────
    socket.on('hint:request', async () => {
      const { roomId, playerName } = socket.data;
      if (!roomId) return;

      const room = getRoom(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      const hint = await getHint(room.problem, player?.code || '');

      socket.emit('hint:response', { hint });
    });

    // ─── disconnect ────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      const result = removePlayerBySocketId(socket.id);
      if (result && !result.roomDeleted) {
        io.to(result.roomId).emit('player:left', { playerName: result.playerName });
        io.to(result.roomId).emit('room:update', getRoomData(result.room));
      }
    });
  });
}

/**
 * Start the 3-second countdown before game begins
 */
function startCountdown(io, room) {
  room.status = 'countdown';
  let count = 3;

  console.log(`[Game] Countdown starting in room ${room.id}`);
  io.to(room.id).emit('countdown:start', { count });

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      io.to(room.id).emit('countdown:tick', { count });
    } else {
      clearInterval(interval);
      room.status = 'racing';
      room.startTime = Date.now();

      console.log(`[Game] Race started in room ${room.id}!`);

      io.to(room.id).emit('game:start', {
        problem: room.problem,
        startTime: room.startTime,
      });
    }
  }, 1000);
}

module.exports = { setupSocketHandlers };
