import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import socket from '../socket';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const playerName = sessionStorage.getItem('playerName');

  // Connect and join room
  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    // If joining, first call the join API
    const isJoining = searchParams.get('join') === 'true';

    const init = async () => {
      if (isJoining) {
        try {
          const res = await fetch(`${SERVER}/api/rooms/${roomId}`);
          const data = await res.json();
          if (!res.ok || !data.canJoin) {
            setError('Cannot join this room');
            return;
          }
        } catch {
          setError('Failed to connect to server');
          return;
        }
      }

      if (!socket.connected) socket.connect();

      socket.emit('room:join', { roomId, playerName });
    };

    init();

    return () => {
      socket.off('room:update');
      socket.off('countdown:start');
      socket.off('countdown:tick');
      socket.off('game:start');
      socket.off('player:left');
    };
  }, [roomId, playerName, navigate, searchParams]);

  // Socket event listeners
  useEffect(() => {
    const onRoomUpdate = (data) => setRoom(data);

    const onCountdownStart = ({ count }) => setCountdown(count);

    const onCountdownTick = ({ count }) => setCountdown(count);

    const onGameStart = () => navigate(`/game/${roomId}`);

    const onPlayerLeft = ({ playerName: leftName }) => {
      setToast(`${leftName} left the room`);
      setTimeout(() => setToast(''), 3000);
    };

    socket.on('room:update', onRoomUpdate);
    socket.on('countdown:start', onCountdownStart);
    socket.on('countdown:tick', onCountdownTick);
    socket.on('game:start', onGameStart);
    socket.on('player:left', onPlayerLeft);

    return () => {
      socket.off('room:update', onRoomUpdate);
      socket.off('countdown:start', onCountdownStart);
      socket.off('countdown:tick', onCountdownTick);
      socket.off('game:start', onGameStart);
      socket.off('player:left', onPlayerLeft);
    };
  }, [roomId, navigate]);

  const handleReady = useCallback(() => {
    socket.emit('player:ready');
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  const isReady = room?.players?.find((p) => p.name === playerName)?.ready;

  if (error) {
    return (
      <div className="page-center">
        <div className="home-container fade-in" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--red)', marginBottom: 20 }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>← Back Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      {toast && <div className="toast">{toast}</div>}

      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-number" key={countdown}>{countdown}</div>
        </div>
      )}

      <div className="lobby-container fade-in">
        <h2 className="lobby-title">Waiting Room</h2>
        <p className="lobby-subtitle">Share the code below to invite your opponent</p>

        <div className="room-code-box">
          <div className="room-code-label">Room Code</div>
          <div className="room-code">{roomId}</div>
          <button className="room-code-copy" onClick={copyCode}>
            {copied ? '✓ Copied!' : '⧉ Click to copy'}
          </button>
        </div>

        <div className="lobby-players">
          {[0, 1].map((i) => {
            const p = room?.players?.[i];
            return (
              <div
                key={i}
                className={`lobby-player-slot ${p ? (p.ready ? 'ready' : '') : 'empty'}`}
              >
                <div className="lobby-player-name">
                  {p ? p.name : 'Waiting...'}
                </div>
                <div className={`lobby-player-status ${p?.ready ? 'ready-text' : ''}`}>
                  {p ? (p.ready ? '✓ Ready' : '○ Not ready') : 'Empty slot'}
                </div>
              </div>
            );
          })}
        </div>

        {room?.problem && (
          <div className="lobby-problem-preview">
            <div className="lobby-problem-title">
              {room.problem.title}
            </div>
            <div className="lobby-problem-meta">
              <span className={`badge badge-${room.problem.difficulty}`}>
                {room.problem.difficulty}
              </span>
              {' '}
              <span style={{ color: 'var(--text-muted)' }}>• {room.problem.topic}</span>
            </div>
          </div>
        )}

        <button
          id="btn-ready"
          className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleReady}
          disabled={isReady || !room || room.players?.length < 2}
          style={{ width: '100%' }}
        >
          {!room || room.players?.length < 2
            ? '⏳ Waiting for opponent...'
            : isReady
            ? '✓ Ready — waiting for opponent'
            : '⚔ Ready Up'}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/')}
          style={{ width: '100%', marginTop: 12 }}
        >
          ← Leave Room
        </button>
      </div>
    </div>
  );
}
