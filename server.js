require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const { connectTwitch } = require('./services/twitch');
const { connectKick } = require('./services/kick');
const { connectYouTube } = require('./services/youtube');
const { parseTwitchChannel, parseKickChannel, parseYouTubeInput } = require('./utils/parse');

const PORT = process.env.PORT || 3847;
const MAX_HISTORY = 50;
const HISTORY_TTL_MS = 60_000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();
const history = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/overlay', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

app.get('/api/status', (_req, res) => {
  res.json({
    twitch: parseTwitchChannel(process.env.TWITCH_CHANNEL) || null,
    kick: parseKickChannel(process.env.KICK_CHANNEL) || null,
    youtube: parseYouTubeInput(process.env.YOUTUBE_VIDEO_ID, process.env.YOUTUBE_CHANNEL) || null,
    connectedClients: clients.size,
    messagesInHistory: history.length,
  });
});

app.get('/api/test-message', (_req, res) => {
  handleChatMessage({
    platform: 'twitch',
    username: 'Teste',
    message: 'Se você vê isso, o overlay está funcionando!',
    color: '#9146FF',
    badges: {},
    timestamp: Date.now(),
  });
  res.json({ ok: true });
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function pruneHistory() {
  const cutoff = Date.now() - HISTORY_TTL_MS;
  while (history.length > 0 && history[0].timestamp < cutoff) {
    history.shift();
  }
}

function getActiveHistory() {
  pruneHistory();
  return history;
}

function handleChatMessage(msg) {
  history.push(msg);
  pruneHistory();
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  broadcast({ type: 'message', data: msg });
}

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.send(JSON.stringify({ type: 'history', data: getActiveHistory() }));

  ws.on('close', () => clients.delete(ws));
});

// Conectar plataformas configuradas
const twitchChannel = parseTwitchChannel(process.env.TWITCH_CHANNEL);
const kickChannel = parseKickChannel(process.env.KICK_CHANNEL);
const youtubeInput = parseYouTubeInput(
  process.env.YOUTUBE_VIDEO_ID,
  process.env.YOUTUBE_CHANNEL
);
const twitchOAuth = process.env.TWITCH_OAUTH?.trim();

if (twitchChannel) {
  connectTwitch(twitchChannel, twitchOAuth, handleChatMessage);
} else {
  console.log('[Twitch] Desativado (TWITCH_CHANNEL não configurado)');
}

if (kickChannel) {
  connectKick(kickChannel, handleChatMessage);
} else {
  console.log('[Kick] Desativado (KICK_CHANNEL não configurado)');
}

if (youtubeInput) {
  connectYouTube(youtubeInput, handleChatMessage);
} else if (process.env.YOUTUBE_VIDEO_ID?.trim() || process.env.YOUTUBE_CHANNEL?.trim()) {
  console.log('[YouTube] Configuração inválida. Use YOUTUBE_CHANNEL=@seu_canal ou YOUTUBE_VIDEO_ID=id_da_live');
} else {
  console.log('[YouTube] Desativado (YOUTUBE_CHANNEL ou YOUTUBE_VIDEO_ID não configurado)');
}

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║         MEU MULTICHAT — OBS Overlay          ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log(`  ║  Overlay OBS:  http://localhost:${PORT}/overlay`);
  console.log(`  ║  Painel:        http://localhost:${PORT}/`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`  [ERRO] A porta ${PORT} já está em uso.`);
    console.error('  O servidor já está rodando, ou outro programa usa essa porta.');
    console.error('');
    console.error('  Soluções:');
    console.error('  • Use o overlay: http://localhost:' + PORT + '/overlay');
    console.error('  • Ou execute parar.bat e inicie de novo');
    console.error('');
    process.exit(1);
  }
  throw err;
});
