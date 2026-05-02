import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import socket from '../socket';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const playerName = sessionStorage.getItem('playerName');

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [opponentCode, setOpponentCode] = useState('');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [toast, setToast] = useState('');
  const [timer, setTimer] = useState(0);
  const [myProgress, setMyProgress] = useState({ passed: 0, total: 0 });
  const [oppProgress, setOppProgress] = useState({ passed: 0, total: 0 });
  const timerRef = useRef(null);
  const codeRef = useRef('');

  // Connect & listen
  useEffect(() => {
    if (!playerName) { navigate('/'); return; }
    if (!socket.connected) socket.connect();
    socket.emit('room:join', { roomId, playerName });

    return () => {
      clearInterval(timerRef.current);
      socket.off('game:start');
      socket.off('opponent:code');
      socket.off('submission:running');
      socket.off('submission:result');
      socket.off('hint:response');
      socket.off('game:over');
      socket.off('player:left');
      socket.off('room:update');
    };
  }, [roomId, playerName, navigate]);

  useEffect(() => {
    const onGameStart = ({ problem: prob, startTime }) => {
      setProblem(prob);
      setCode(prob.starterCode || '');
      codeRef.current = prob.starterCode || '';
      // Start timer
      const start = startTime || Date.now();
      timerRef.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - start) / 1000));
      }, 200);
    };

    const onOpponentCode = ({ playerName: pName, code: c }) => {
      setOpponentName(pName);
      setOpponentCode(c);
    };

    const onSubmissionRunning = () => setSubmitting(true);

    const onSubmissionResult = ({ passed, total, allPassed, results: res, error }) => {
      setSubmitting(false);
      setMyProgress({ passed, total });
      if (error) {
        setResults([{ passed: false, error, hidden: false }]);
      } else {
        setResults(res);
      }
    };

    const onHintResponse = ({ hint: h }) => {
      setHintLoading(false);
      setHint(h);
    };

    const onGameOver = (data) => {
      clearInterval(timerRef.current);
      setGameOver(data);
    };

    const onPlayerLeft = ({ playerName: leftName }) => {
      setToast(`${leftName} disconnected`);
      setTimeout(() => setToast(''), 4000);
    };

    const onRoomUpdate = (data) => {
      if (data.players) {
        const opp = data.players.find((p) => p.name !== playerName);
        if (opp) {
          setOppProgress({ passed: opp.passed, total: opp.total });
          setOpponentName(opp.name);
        }
        const me = data.players.find((p) => p.name === playerName);
        if (me) setMyProgress({ passed: me.passed, total: me.total });
      }
    };

    socket.on('game:start', onGameStart);
    socket.on('opponent:code', onOpponentCode);
    socket.on('submission:running', onSubmissionRunning);
    socket.on('submission:result', onSubmissionResult);
    socket.on('hint:response', onHintResponse);
    socket.on('game:over', onGameOver);
    socket.on('player:left', onPlayerLeft);
    socket.on('room:update', onRoomUpdate);

    return () => {
      socket.off('game:start', onGameStart);
      socket.off('opponent:code', onOpponentCode);
      socket.off('submission:running', onSubmissionRunning);
      socket.off('submission:result', onSubmissionResult);
      socket.off('hint:response', onHintResponse);
      socket.off('game:over', onGameOver);
      socket.off('player:left', onPlayerLeft);
      socket.off('room:update', onRoomUpdate);
    };
  }, [playerName]);

  const handleCodeChange = useCallback((val) => {
    setCode(val);
    codeRef.current = val;
    socket.emit('code:update', { code: val });
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitting) return;
    socket.emit('code:submit', { code: codeRef.current });
  }, [submitting]);

  const handleHint = useCallback(() => {
    if (hintLoading) return;
    setHintLoading(true);
    socket.emit('hint:request');
  }, [hintLoading]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatMs = (ms) => {
    if (!ms) return '--';
    const s = Math.floor(ms / 1000);
    return formatTime(s);
  };

  // Loading state
  if (!problem) {
    return (
      <div className="page-center">
        <div className="fade-in" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading battle arena...</p>
        </div>
      </div>
    );
  }

  const visibleResults = results?.filter((r) => !r.hidden) || [];
  const totalTests = myProgress.total || problem.testCases?.length || 0;

  return (
    <div className="game-layout">
      {toast && <div className="toast">{toast}</div>}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="gameover-overlay">
          <div className="gameover-card fade-in">
            <div className="gameover-trophy">🏆</div>
            <div className="gameover-title">
              {gameOver.winner === playerName ? 'You Win!' : 'You Lose'}
            </div>
            <div className="gameover-winner">
              {gameOver.winner} solved it in {formatMs(gameOver.finishTime)}
            </div>
            <div className="gameover-stats">
              {gameOver.results?.map((r) => (
                <div
                  key={r.name}
                  className={`gameover-stat ${r.name === gameOver.winner ? 'winner-stat' : ''}`}
                >
                  <div className="gameover-stat-name">{r.name}</div>
                  <div className="gameover-stat-tests" style={{ color: r.name === gameOver.winner ? 'var(--accent)' : 'var(--text)' }}>
                    {r.passed}/{r.total} passed
                  </div>
                  <div className="gameover-stat-time">
                    {r.finished ? formatMs(r.finishTime) : 'DNF'}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ width: '100%' }}>
              ← Play Again
            </button>
          </div>
        </div>
      )}

      {/* ─── LEFT PANE ─── */}
      <div className="game-left">
        <div className="game-left-header">
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ color: '#fff' }}>ALGO</span>
            <span style={{ color: 'var(--accent)' }}>ARENA</span>
          </span>
          <div className="game-timer">{formatTime(timer)}</div>
        </div>

        <div className="game-problem-scroll">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h1 className="game-problem-title">{problem.title}</h1>
            <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty}</span>
          </div>

          <div className="game-problem-desc">{problem.description}</div>

          <div className="section-heading">Examples</div>
          {problem.examples?.map((ex, i) => (
            <div key={i} className="example-box">
              <div className="example-label">Input</div>
              <div className="example-content">{ex.input}</div>
              <div className="example-label" style={{ marginTop: 8 }}>Output</div>
              <div className="example-content">{ex.output}</div>
              {ex.explanation && (
                <div className="example-explanation">💡 {ex.explanation}</div>
              )}
            </div>
          ))}

          {problem.constraints?.length > 0 && (
            <>
              <div className="section-heading">Constraints</div>
              <ul className="constraints-list">
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}

          {/* Test Results */}
          {results && (
            <>
              <div className="section-heading">Test Results</div>
              <div className="test-results">
                {visibleResults.map((r, i) => (
                  <div key={i} className={`test-result-item ${r.passed ? 'passed' : 'failed'}`}>
                    <span className="test-result-icon">{r.passed ? '✅' : '❌'}</span>
                    <div className="test-result-detail">
                      <div className="label">Test {i + 1}</div>
                      {r.error ? (
                        <div className="value" style={{ color: 'var(--red)' }}>{r.error}</div>
                      ) : (
                        <>
                          <div className="value">Output: {r.output}</div>
                          {!r.passed && (
                            <div className="value" style={{ color: 'var(--text-muted)' }}>Expected: {r.expected}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {results.some((r) => r.hidden) && (
                  <div className="test-result-item" style={{ color: 'var(--text-muted)' }}>
                    <span className="test-result-icon">🔒</span>
                    <div className="test-result-detail">
                      <div className="label">Hidden Tests</div>
                      <div className="value">
                        {results.filter((r) => r.hidden && r.passed).length}/
                        {results.filter((r) => r.hidden).length} passed
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {submitting && (
            <div className="submit-loading">
              <div className="spinner"></div>
              Running your code...
            </div>
          )}

          {/* Hint */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleHint}
            disabled={hintLoading}
            style={{ marginTop: 16 }}
          >
            {hintLoading ? '⟳ Thinking...' : '💡 Get Hint'}
          </button>

          {hint && (
            <div className="hint-panel">
              <div className="hint-panel-title">💡 Hint</div>
              <div className="hint-panel-text">{hint}</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE ─── */}
      <div className="game-right">
        <div className="editor-header">
          <div className="editor-header-left">
            <span className="editor-lang-badge">Python</span>
            <span className="editor-header-title">Your Solution</span>
          </div>
          <div className="editor-actions">
            <button
              id="btn-submit"
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting || !!gameOver}
            >
              {submitting ? '⟳ Running...' : '▶ Submit'}
            </button>
          </div>
        </div>

        <div className="editor-main">
          <CodeMirror
            value={code}
            height="100%"
            theme={oneDark}
            extensions={[python()]}
            onChange={handleCodeChange}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: false,
              dropCursor: true,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightActiveLine: true,
            }}
          />
        </div>

        {/* Progress bars */}
        <div className="progress-section">
          <div className="progress-row">
            <span className="progress-name" style={{ color: 'var(--accent)' }}>{playerName}</span>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill green"
                style={{ width: totalTests > 0 ? `${(myProgress.passed / totalTests) * 100}%` : '0%' }}
              />
            </div>
            <span className="progress-label">{myProgress.passed}/{totalTests}</span>
          </div>
          <div className="progress-row">
            <span className="progress-name" style={{ color: 'var(--blue)' }}>{opponentName}</span>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill blue"
                style={{ width: totalTests > 0 ? `${(oppProgress.passed / totalTests) * 100}%` : '0%' }}
              />
            </div>
            <span className="progress-label">{oppProgress.passed}/{totalTests}</span>
          </div>
        </div>

        {/* Opponent code strip */}
        <div className="opponent-strip">
          <div className="opponent-strip-header">
            <span className="opponent-strip-title">👁 {opponentName}&apos;s Code (Live)</span>
          </div>
          <div className="opponent-strip-editor">
            <CodeMirror
              value={opponentCode}
              height="120px"
              theme={oneDark}
              extensions={[python()]}
              editable={false}
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
