const fs = require('fs');
const path = require('path');
const net = require('net');

const ENV_PATH = path.join(__dirname, '..', '.env');

/** Portas fixas disponíveis para seleção */
const AVAILABLE_PORTS = [3847, 3857, 3867];

const DEFAULT_ENV = {
  PORT: '3847',
  TWITCH_CHANNEL: '',
  KICK_CHANNEL: '',
  YOUTUBE_CHANNEL: '',
  YOUTUBE_VIDEO_ID: '',
  TWITCH_OAUTH: '',
  OVERLAY_FONT_SIZE: '22',
  OVERLAY_FONT_SIZE_FIXO: '16',
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return { ...DEFAULT_ENV };
  }

  const config = { ...DEFAULT_ENV };
  const content = fs.readFileSync(ENV_PATH, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key in config || ['PORT', 'TWITCH_CHANNEL', 'KICK_CHANNEL', 'YOUTUBE_CHANNEL', 'YOUTUBE_VIDEO_ID', 'TWITCH_OAUTH', 'OVERLAY_FONT_SIZE', 'OVERLAY_FONT_SIZE_FIXO'].includes(key)) {
      config[key] = value;
    }
  }

  return config;
}

function writeEnvFile(updates) {
  const current = readEnvFile();
  const merged = { ...current, ...updates };

  const port = String(merged.PORT || DEFAULT_ENV.PORT);
  if (!AVAILABLE_PORTS.includes(Number(port))) {
    throw new Error(`Porta inválida. Use uma destas: ${AVAILABLE_PORTS.join(', ')}`);
  }

  const fontSize = Number(merged.OVERLAY_FONT_SIZE || DEFAULT_ENV.OVERLAY_FONT_SIZE);
  const fontSizeFixo = Number(merged.OVERLAY_FONT_SIZE_FIXO || DEFAULT_ENV.OVERLAY_FONT_SIZE_FIXO);
  if (!Number.isFinite(fontSize) || fontSize < MIN_FONT_SIZE || fontSize > MAX_FONT_SIZE) {
    throw new Error(`Tamanho da fonte inválido. Use entre ${MIN_FONT_SIZE} e ${MAX_FONT_SIZE}px.`);
  }
  if (!Number.isFinite(fontSizeFixo) || fontSizeFixo < MIN_FONT_SIZE || fontSizeFixo > MAX_FONT_SIZE) {
    throw new Error(`Tamanho da fonte do chat fixo inválido. Use entre ${MIN_FONT_SIZE} e ${MAX_FONT_SIZE}px.`);
  }

  const lines = [
    '# Porta do servidor local',
    `PORT=${port}`,
    '',
    '# Canais — pode usar só o nome ou a URL completa',
    `TWITCH_CHANNEL=${merged.TWITCH_CHANNEL || ''}`,
    `KICK_CHANNEL=${merged.KICK_CHANNEL || ''}`,
    '',
    '# YouTube: canal (busca live automaticamente) OU ID do vídeo ao vivo',
    `YOUTUBE_CHANNEL=${merged.YOUTUBE_CHANNEL || ''}`,
    `YOUTUBE_VIDEO_ID=${merged.YOUTUBE_VIDEO_ID || ''}`,
    '',
    '# Opcional: token OAuth do Twitch',
    `TWITCH_OAUTH=${merged.TWITCH_OAUTH || ''}`,
    '',
    '# Aparência do overlay',
    `OVERLAY_FONT_SIZE=${Math.round(fontSize)}`,
    `OVERLAY_FONT_SIZE_FIXO=${Math.round(fontSizeFixo)}`,
    '',
  ];

  fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
  return merged;
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', (err) => {
      resolve(err.code === 'EADDRINUSE');
    });

    tester.once('listening', () => {
      tester.close(() => resolve(false));
    });

    tester.listen(port, '127.0.0.1');
  });
}

async function getPortsStatus(currentPort) {
  const current = Number(currentPort);
  const results = [];

  for (const port of AVAILABLE_PORTS) {
    const inUse = await isPortInUse(port);
    results.push({
      port,
      inUse,
      current: port === current,
      available: !inUse || port === current,
    });
  }

  return results;
}

module.exports = {
  ENV_PATH,
  AVAILABLE_PORTS,
  readEnvFile,
  writeEnvFile,
  getPortsStatus,
};
