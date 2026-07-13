require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const { connectTwitch } = require('./services/twitch');
const { connectKick } = require('./services/kick');
const { connectYouTube } = require('./services/youtube');
const { parseTwitchChannel, parseKickChannel, parseYouTubeInput } = require('./utils/parse');
const { readEnvFile, writeEnvFile, getPortsStatus, AVAILABLE_PORTS } = require('./utils/config');

const PORT = Number(process.env.PORT) || AVAILABLE_PORTS[0];
const MAX_HISTORY = 50;
const HISTORY_TTL_MS = 60_000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();
const history = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/notification-som', express.static(path.join(__dirname, 'notification-som')));

app.get('/overlaypublico', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

app.get('/chatfixostremer', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

app.get('/overlay', (_req, res) => {
  res.redirect('/overlaypublico');
});

app.get('/api/config', async (_req, res) => {
  try {
    const config = readEnvFile();
    const ports = await getPortsStatus(PORT);
    res.json({ config, ports, availablePorts: AVAILABLE_PORTS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { PORT: newPort, TWITCH_CHANNEL, KICK_CHANNEL, YOUTUBE_CHANNEL, YOUTUBE_VIDEO_ID, TWITCH_OAUTH, OVERLAY_FONT_SIZE, OVERLAY_FONT_SIZE_FIXO } = req.body;

    const saved = writeEnvFile({
      PORT: String(newPort || PORT),
      TWITCH_CHANNEL: TWITCH_CHANNEL ?? '',
      KICK_CHANNEL: KICK_CHANNEL ?? '',
      YOUTUBE_CHANNEL: YOUTUBE_CHANNEL ?? '',
      YOUTUBE_VIDEO_ID: YOUTUBE_VIDEO_ID ?? '',
      TWITCH_OAUTH: TWITCH_OAUTH ?? '',
      OVERLAY_FONT_SIZE: OVERLAY_FONT_SIZE ?? readEnvFile().OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO: OVERLAY_FONT_SIZE_FIXO ?? readEnvFile().OVERLAY_FONT_SIZE_FIXO,
    });

    const portChanged = Number(saved.PORT) !== PORT;
    broadcastOverlayStyle();
    res.json({
      ok: true,
      config: saved,
      restartRequired: portChanged,
      message: portChanged
        ? 'Configuração salva! Reinicie o servidor (feche e abra o iniciar.bat) para aplicar a nova porta.'
        : 'Configuração salva! Reinicie o servidor para reconectar aos canais.',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/overlay-appearance', (req, res) => {
  try {
    const current = readEnvFile();
    const { OVERLAY_FONT_SIZE, OVERLAY_FONT_SIZE_FIXO } = req.body || {};
    const saved = writeEnvFile({
      ...current,
      OVERLAY_FONT_SIZE: OVERLAY_FONT_SIZE ?? current.OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO: OVERLAY_FONT_SIZE_FIXO ?? current.OVERLAY_FONT_SIZE_FIXO,
    });
    broadcastOverlayStyle();
    res.json({ ok: true, config: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({
    port: PORT,
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

function getOverlayStyleConfig() {
  const config = readEnvFile();
  return {
    OVERLAY_FONT_SIZE: config.OVERLAY_FONT_SIZE,
    OVERLAY_FONT_SIZE_FIXO: config.OVERLAY_FONT_SIZE_FIXO,
  };
}

function broadcastOverlayStyle() {
  broadcast({ type: 'style', data: getOverlayStyleConfig() });
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
  ws.send(JSON.stringify({ type: 'style', data: getOverlayStyleConfig() }));
  ws.on('close', () => clients.delete(ws));
});

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
  console.log(`  ║  Configuração: http://localhost:${PORT}/`);
  console.log(`  ║  Overlay publico: http://localhost:${PORT}/overlaypublico`);
  console.log(`  ║  Chat fixo:       http://localhost:${PORT}/chatfixostremer`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`  [ERRO] A porta ${PORT} já está em uso.`);
    console.error(`  Portas disponíveis: ${AVAILABLE_PORTS.join(', ')}`);
    console.error('  Abra o painel em outra porta ou execute parar.bat e tente de novo.');
    console.error('');
    process.exit(1);
  }
  throw err;
});
