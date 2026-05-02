import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const TOPICS = [
  { value: 'arrays', label: 'Arrays' },
  { value: 'strings', label: 'Strings' },
  { value: 'hashmaps', label: 'Hashmaps' },
  { value: 'two pointers', label: 'Two Pointers' },
  { value: 'recursion', label: 'Recursion' },
  { value: 'sorting', label: 'Sorting' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('create');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('arrays');
  const [difficulty, setDifficulty] = useState('medium');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), topic, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      sessionStorage.setItem('playerName', name.trim());
      navigate(`/lobby/${data.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    if (!roomCode.trim() || roomCode.trim().length !== 6) return setError('Enter a valid 6-character room code');
    setLoading(true);
    setError('');
    const code = roomCode.trim().toUpperCase();
    try {
      const res = await fetch(`${SERVER}/api/rooms/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Room not found');
      if (!data.canJoin) throw new Error('Room is full or game already started');
      sessionStorage.setItem('playerName', name.trim());
      navigate(`/lobby/${code}?join=true&name=${encodeURIComponent(name.trim())}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="home-container fade-in">
        <h1 className="home-logo">
          <span className="white">ALGO</span>
          <span className="green">ARENA</span>
        </h1>
        <p className="home-subtitle">1v1 Real-Time Algorithm Battle Arena</p>

        <div className="home-toggle">
          <button
            className={mode === 'create' ? 'active' : ''}
            onClick={() => { setMode('create'); setError(''); }}
          >
            Create Room
          </button>
          <button
            className={mode === 'join' ? 'active' : ''}
            onClick={() => { setMode('join'); setError(''); }}
          >
            Join Room
          </button>
        </div>

        {mode === 'create' ? (
          <form className="home-form" onSubmit={handleCreate}>
            <input
              id="create-name"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
            <div className="row">
              <select id="select-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select id="select-difficulty" className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <button id="btn-create" className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⟳ Generating Problem...' : '⚔ Create Battle Room'}
            </button>
          </form>
        ) : (
          <form className="home-form" onSubmit={handleJoin}>
            <input
              id="join-name"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
            <input
              id="join-code"
              className="input"
              placeholder="6-character room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoComplete="off"
              style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem' }}
            />
            <button id="btn-join" className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⟳ Joining...' : '→ Join Battle'}
            </button>
          </form>
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '14px' }}>{error}</p>}
      </div>
    </div>
  );
}
