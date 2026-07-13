require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const { connectTwitch } = require('./services/twitch');
const { connectKick } = require('./services/kick');
const { connectYouTube } = require('./services/youtube');
const { parseTwitchChannel, parseKickChannel, parseYouTubeInput } = require('./utils/parse');
const {
  readEnvFile,
  writeEnvFile,
  getPortsStatus,
  AVAILABLE_PORTS,
  normalizeSoundEnabled,
} = require('./utils/config');

const PORT = Number(process.env.PORT) || AVAILABLE_PORTS[0];
const MAX_HISTORY = 100;
const HISTORY_TTL_MS = 600_000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();
const history = [];
let lastNotificationSoundAt = 0;
let pinnedStreamerMessage = null;

app.use(express.json());

function getOverlayStyleConfig(mode = 'publico') {
  const config = readEnvFile();
  const isFixo = mode === 'fixo';
  return {
    OVERLAY_MODE: isFixo ? 'fixo' : 'publico',
    OVERLAY_FONT_SIZE: config.OVERLAY_FONT_SIZE,
    OVERLAY_FONT_SIZE_FIXO: config.OVERLAY_FONT_SIZE_FIXO,
    OVERLAY_MAX_MESSAGES: isFixo ? '100' : config.OVERLAY_MAX_MESSAGES,
    NOTIFICATION_SOUND_ENABLED: config.NOTIFICATION_SOUND_ENABLED,
    NOTIFICATION_SOUND_INTERVAL: config.NOTIFICATION_SOUND_INTERVAL,
  };
}

function sendOverlayPage(res, mode = 'publico') {
  const htmlPath = path.join(__dirname, 'public', 'overlay.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const boot = JSON.stringify(getOverlayStyleConfig(mode));
  const cacheBust = Date.now();
  html = html.replace(
    '/*__MULTICHAT_STYLE_BOOTSTRAP__*/',
    `window.__MULTICHAT_STYLE__=${boot};`
  );
  html = html.replace(
    /src="\/overlay\.v\d+\.js"/,
    `src="/overlay.v23.js?t=${cacheBust}"`
  );
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.type('html').send(html);
}

app.get('/overlaypublico', (_req, res) => {
  sendOverlayPage(res, 'publico');
});

app.get('/chatfixostremer', (_req, res) => {
  sendOverlayPage(res, 'fixo');
});

app.get('/overlay', (_req, res) => {
  res.redirect('/overlaypublico');
});

app.get('/overlay.html', (_req, res) => {
  res.redirect('/overlaypublico');
});

app.get(
  [
    '/overlay.js',
    '/overlay.v16.js',
    '/overlay.v17.js',
    '/overlay.v18.js',
    '/overlay.v19.js',
    '/overlay.v20.js',
    '/overlay.v21.js',
    '/overlay.v22.js',
    '/overlay.v23.js',
  ],
  (_req, res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.type('application/javascript').sendFile(path.join(__dirname, 'public', 'overlay.js'));
  }
);

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.css')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  },
}));
app.use('/notification-som', express.static(path.join(__dirname, 'notification-som')));

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
    const current = readEnvFile();
    const {
      PORT: newPort,
      TWITCH_CHANNEL,
      KICK_CHANNEL,
      YOUTUBE_CHANNEL,
      YOUTUBE_VIDEO_ID,
      TWITCH_OAUTH,
      STREAMER_DISPLAY_NAME,
      OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO,
      OVERLAY_MAX_MESSAGES,
      NOTIFICATION_SOUND_ENABLED,
      NOTIFICATION_SOUND_INTERVAL,
    } = req.body;

    const saved = writeEnvFile({
      PORT: String(newPort || PORT),
      TWITCH_CHANNEL: TWITCH_CHANNEL ?? '',
      KICK_CHANNEL: KICK_CHANNEL ?? '',
      YOUTUBE_CHANNEL: YOUTUBE_CHANNEL ?? '',
      YOUTUBE_VIDEO_ID: YOUTUBE_VIDEO_ID ?? '',
      TWITCH_OAUTH: TWITCH_OAUTH ?? '',
      STREAMER_DISPLAY_NAME: STREAMER_DISPLAY_NAME ?? current.STREAMER_DISPLAY_NAME,
      OVERLAY_FONT_SIZE: OVERLAY_FONT_SIZE ?? current.OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO: OVERLAY_FONT_SIZE_FIXO ?? current.OVERLAY_FONT_SIZE_FIXO,
      OVERLAY_MAX_MESSAGES: OVERLAY_MAX_MESSAGES ?? current.OVERLAY_MAX_MESSAGES,
      NOTIFICATION_SOUND_ENABLED: NOTIFICATION_SOUND_ENABLED ?? current.NOTIFICATION_SOUND_ENABLED,
      NOTIFICATION_SOUND_INTERVAL: NOTIFICATION_SOUND_INTERVAL ?? current.NOTIFICATION_SOUND_INTERVAL,
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
    const {
      OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO,
      OVERLAY_MAX_MESSAGES,
      NOTIFICATION_SOUND_ENABLED,
      NOTIFICATION_SOUND_INTERVAL,
    } = req.body || {};
    const saved = writeEnvFile({
      ...current,
      OVERLAY_FONT_SIZE: OVERLAY_FONT_SIZE ?? current.OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO: OVERLAY_FONT_SIZE_FIXO ?? current.OVERLAY_FONT_SIZE_FIXO,
      OVERLAY_MAX_MESSAGES: OVERLAY_MAX_MESSAGES ?? current.OVERLAY_MAX_MESSAGES,
      NOTIFICATION_SOUND_ENABLED: NOTIFICATION_SOUND_ENABLED ?? current.NOTIFICATION_SOUND_ENABLED,
      NOTIFICATION_SOUND_INTERVAL: NOTIFICATION_SOUND_INTERVAL ?? current.NOTIFICATION_SOUND_INTERVAL,
    });
    // Permite testar o novo intervalo imediatamente
    lastNotificationSoundAt = 0;
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

function getStreamerDisplayName() {
  const config = readEnvFile();
  const custom = String(config.STREAMER_DISPLAY_NAME || '').trim();
  if (custom) return custom.slice(0, 40);

  return (
    parseTwitchChannel(process.env.TWITCH_CHANNEL) ||
    parseKickChannel(process.env.KICK_CHANNEL) ||
    'Streamer'
  );
}

function sanitizeStreamerMessage(raw) {
  const text = String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
  if (!text) return null;
  return text.slice(0, 300);
}

function handleStreamerMessage(rawMessage) {
  const message = sanitizeStreamerMessage(rawMessage);
  if (!message) {
    return { ok: false, error: 'Mensagem vazia.' };
  }

  handleChatMessage({
    platform: 'streamer',
    username: getStreamerDisplayName(),
    message,
    color: '#fbbf24',
    badges: {},
    timestamp: Date.now(),
  });

  return { ok: true };
}

function buildStreamerPayload(message) {
  return {
    platform: 'streamer',
    username: getStreamerDisplayName(),
    message,
    color: '#fbbf24',
    badges: {},
    timestamp: Date.now(),
    pinned: true,
  };
}

function setPinnedStreamerMessage(message) {
  pinnedStreamerMessage = buildStreamerPayload(message);
  broadcast({ type: 'pinned', data: pinnedStreamerMessage });
  return { ok: true, pinned: pinnedStreamerMessage };
}

function clearPinnedStreamerMessage() {
  pinnedStreamerMessage = null;
  broadcast({ type: 'pinned', data: null });
  return { ok: true, pinned: null };
}

function handleStreamerPin(rawMessage) {
  const message = sanitizeStreamerMessage(rawMessage);
  if (!message) {
    return { ok: false, error: 'Mensagem vazia.' };
  }
  return setPinnedStreamerMessage(message);
}

app.post('/api/streamer-message', (req, res) => {
  const result = handleStreamerMessage(req.body && req.body.message);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

app.post('/api/streamer-pin', (req, res) => {
  const result = handleStreamerPin(req.body && req.body.message);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

app.delete('/api/streamer-pin', (_req, res) => {
  res.json(clearPinnedStreamerMessage());
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function broadcastOverlayStyle() {
  // Envia estilo neutro (sem forçar limite do público nos clientes fixo;
  // cada página aplica com resolveMaxMessages / OVERLAY_MODE do boot).
  const config = readEnvFile();
  broadcast({
    type: 'style',
    data: {
      OVERLAY_FONT_SIZE: config.OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO: config.OVERLAY_FONT_SIZE_FIXO,
      OVERLAY_MAX_MESSAGES: config.OVERLAY_MAX_MESSAGES,
      NOTIFICATION_SOUND_ENABLED: config.NOTIFICATION_SOUND_ENABLED,
      NOTIFICATION_SOUND_INTERVAL: config.NOTIFICATION_SOUND_INTERVAL,
    },
  });
}

function canPlayNotificationSoundNow() {
  const config = readEnvFile();
  if (normalizeSoundEnabled(config.NOTIFICATION_SOUND_ENABLED) !== '1') return false;

  const intervalSec = Number(config.NOTIFICATION_SOUND_INTERVAL);
  const gapMs = (Number.isFinite(intervalSec) ? intervalSec : 0) * 1000;
  const now = Date.now();

  if (gapMs > 0 && now - lastNotificationSoundAt < gapMs) return false;

  lastNotificationSoundAt = now;
  return true;
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
  const playSound = canPlayNotificationSoundNow();
  const payload = { ...msg, playSound };

  history.push(payload);
  pruneHistory();
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  broadcast({ type: 'message', data: payload });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  const hist = getActiveHistory().map((msg) => ({ ...msg, playSound: false }));
  ws.send(JSON.stringify({ type: 'history', data: hist }));
  // Sem OVERLAY_MODE: o cliente mantém o modo do boot da página
  const config = readEnvFile();
  ws.send(JSON.stringify({
    type: 'style',
    data: {
      OVERLAY_FONT_SIZE: config.OVERLAY_FONT_SIZE,
      OVERLAY_FONT_SIZE_FIXO: config.OVERLAY_FONT_SIZE_FIXO,
      OVERLAY_MAX_MESSAGES: config.OVERLAY_MAX_MESSAGES,
      NOTIFICATION_SOUND_ENABLED: config.NOTIFICATION_SOUND_ENABLED,
      NOTIFICATION_SOUND_INTERVAL: config.NOTIFICATION_SOUND_INTERVAL,
    },
  }));
  ws.send(JSON.stringify({ type: 'pinned', data: pinnedStreamerMessage }));

  ws.on('message', (raw) => {
    try {
      const payload = JSON.parse(String(raw));
      if (!payload || !payload.type) return;
      if (payload.type === 'streamer-message') {
        handleStreamerMessage(payload.message);
      } else if (payload.type === 'streamer-pin') {
        handleStreamerPin(payload.message);
      } else if (payload.type === 'streamer-unpin') {
        clearPinnedStreamerMessage();
      }
    } catch {
      // ignora payload inválido
    }
  });

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
