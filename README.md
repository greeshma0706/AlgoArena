# ⚔️ AlgoArena — 1v1 Real-Time Algorithm Battle Arena

A multiplayer web app where two players join a room, receive an AI-generated coding problem, and race to solve it first. No accounts needed — just share a link and battle.

![AlgoArena Screenshot](screenshot-placeholder.png)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, react-router-dom, socket.io-client |
| Editor | @uiw/react-codemirror + @codemirror/lang-python |
| Backend | Node.js + Express + Socket.io |
| AI | Anthropic SDK (Claude Sonnet) |
| Execution | Python subprocess via child_process (5s timeout) |
| Fonts | JetBrains Mono + Syne (Google Fonts) |

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- Python 3 installed and available as `python` in PATH
- Anthropic API key

### Install & Run

```bash
# 1. Clone the repo
git clone <repo-url> && cd algoarena

# 2. Install all dependencies
npm run install:all

# 3. Set your API key
# Edit server/.env and set ANTHROPIC_API_KEY=sk-ant-...

# 4. Run both server and client
npm run dev
```

The server runs on `http://localhost:3001` and the client on `http://localhost:5173`.

## 🎮 How to Play

1. **Create a Room** — Enter your name, pick a topic and difficulty, then create a battle room
2. **Share the Code** — Give your opponent the 6-character room code
3. **Ready Up** — Both players hit Ready, and a 3-second countdown begins
4. **Code!** — Solve the problem in Python. You can see your opponent typing live
5. **Submit** — First to pass all test cases wins! Use hints if you're stuck

## 📁 Folder Structure

```
algoarena/
├── package.json          # Root scripts (dev, install:all)
├── server/
│   ├── .env              # ANTHROPIC_API_KEY
│   ├── index.js          # Express + Socket.io server
│   ├── rooms.js          # In-memory room management
│   ├── socketHandlers.js # Socket event handlers
│   ├── aiService.js      # Claude problem generation & hints
│   └── executor.js       # Python code runner
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx         # Router
        ├── index.css       # Global styles
        ├── socket.js       # Socket.io client
        └── pages/
            ├── Home.jsx    # Create/Join room
            ├── Lobby.jsx   # Waiting room
            └── Game.jsx    # Battle arena
```

## 📝 Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | `server/.env` | Your Anthropic API key |
| `VITE_SERVER_URL` | Client env | Server URL (defaults to `http://localhost:3001`) |
