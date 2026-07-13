const params = new URLSearchParams(location.search);
const pathBase = location.pathname.replace(/\/$/, '');
const bootStyle = window.__MULTICHAT_STYLE__ || {};

// Preferência absoluta: modo injetado pelo servidor na rota
const isObsChatFixo =
  bootStyle.OVERLAY_MODE === 'fixo' ||
  /\/chatfixostremer$/i.test(pathBase) ||
  params.has('obschatfixo');

const isPreview = params.has('preview') || isObsChatFixo;
const isDemo = params.has('demo');
const soundForcedOff = params.get('sound') === '0';

const MESSAGE_LIFETIME_MS = (isDemo || isObsChatFixo) ? 600000 : 60000;
const MAX_MESSAGES_FIXO = 100;
const MAX_MESSAGE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const FADE_DURATION_MS = 500;

const messageTimers = new WeakMap();

const NOTIFICATION_SOUND_URL = '/notification-som/notification.mp3';
const SOUND_INTERVALS = [0, 10, 20, 30, 40, 50, 60];
let notificationAudioTemplate = null;
let notificationSoundEnabled = !soundForcedOff;
let notificationSoundIntervalSec = 0;
let lastNotificationAt = 0;

function resolveMaxMessages(config) {
  if (isObsChatFixo || (config && config.OVERLAY_MODE === 'fixo')) {
    return MAX_MESSAGES_FIXO;
  }
  const maxMsg = Number.parseInt(String((config && config.OVERLAY_MAX_MESSAGES) ?? '10'), 10);
  if (Number.isFinite(maxMsg) && MAX_MESSAGE_OPTIONS.includes(maxMsg)) return maxMsg;
  return 10;
}

// Público: 3–10 (config). Chat fixo: sempre 100.
let maxMessagesShown = resolveMaxMessages(bootStyle);

const PLATFORM_LABELS = {
  twitch: 'TW',
  kick: 'KK',
  youtube: 'YT',
};

const container = document.getElementById('chat-container');
const template = document.getElementById('message-template');
const statusBar = document.getElementById('status-bar');
const statusDot = document.getElementById('status-dot');

if (isPreview) {
  document.body.classList.add('preview-mode');
}

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;
let appliedFontSize = null;

function applyFontSize(size) {
  const px = Number(size);
  if (!Number.isFinite(px) || px < MIN_FONT_SIZE || px > MAX_FONT_SIZE) return;
  if (px === appliedFontSize) return;
  appliedFontSize = px;
  document.documentElement.style.setProperty('--chat-font-size', `${px}px`);
}

function applyStyleFromConfig(config) {
  if (!config) return;
  const size = isObsChatFixo ? config.OVERLAY_FONT_SIZE_FIXO : config.OVERLAY_FONT_SIZE;
  applyFontSize(size);

  // Chat fixo NUNCA herda o limite do overlay público
  maxMessagesShown = resolveMaxMessages(config);
  trimMessagesToLimit();

  if (!soundForcedOff) {
    const enabledRaw = String(config.NOTIFICATION_SOUND_ENABLED ?? '1').toLowerCase();
    notificationSoundEnabled = !['0', 'false', 'off', 'no', 'nao', 'não'].includes(enabledRaw);
  } else {
    notificationSoundEnabled = false;
  }

  const interval = Number.parseInt(String(config.NOTIFICATION_SOUND_INTERVAL ?? '0'), 10);
  if (Number.isFinite(interval) && SOUND_INTERVALS.includes(interval)) {
    notificationSoundIntervalSec = interval;
  }
}

if (window.__MULTICHAT_STYLE__) {
  applyStyleFromConfig(window.__MULTICHAT_STYLE__);
}

async function loadOverlayFontSize() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    applyStyleFromConfig(data.config);
  } catch {
    if (appliedFontSize == null) {
      applyFontSize(isObsChatFixo ? 16 : 22);
    }
  }
}

loadOverlayFontSize();
setInterval(loadOverlayFontSize, 5000);

function getNotificationAudioTemplate() {
  if (!notificationAudioTemplate) {
    notificationAudioTemplate = new Audio(NOTIFICATION_SOUND_URL);
    notificationAudioTemplate.preload = 'auto';
    notificationAudioTemplate.volume = 1;
  }
  return notificationAudioTemplate;
}

function playNotificationSound(force) {
  if (soundForcedOff || !notificationSoundEnabled) return;

  const now = Date.now();
  const minIntervalMs = notificationSoundIntervalSec * 1000;
  if (!force && minIntervalMs > 0 && now - lastNotificationAt < minIntervalMs) return;
  lastNotificationAt = now;

  const audio = getNotificationAudioTemplate().cloneNode();
  audio.volume = 1;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function setStatus(state) {
  statusDot.className = 'status-dot ' + state;
}

function updateEmptyState() {
  if (container.children.length > 0) {
    statusBar.classList.add('hidden');
  } else {
    statusBar.classList.remove('hidden');
  }
}

function getWsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}`;
}

function isInDom(el) {
  return el && el.parentNode;
}

function renderMessageContent(el, data) {
  el.textContent = '';

  const parts = data.parts;
  if (!parts || !parts.length) {
    el.textContent = data.message || '';
    return;
  }

  for (const part of parts) {
    if (part.type === 'text' && part.value) {
      el.appendChild(document.createTextNode(part.value));
    } else if (part.type === 'emote' && part.url) {
      const img = document.createElement('img');
      img.className = 'chat-emote';
      img.src = part.url;
      img.alt = part.alt || '';
      img.title = part.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      el.appendChild(img);
    }
  }

  if (!el.textContent && !el.querySelector('img')) {
    el.textContent = data.message || '';
  }
}

function removeMessage(messageEl, instant) {
  const timer = messageTimers.get(messageEl);
  if (timer) {
    clearTimeout(timer);
    messageTimers.delete(messageEl);
  }

  if (!isInDom(messageEl)) return;

  if (instant) {
    messageEl.remove();
    updateEmptyState();
    return;
  }

  messageEl.classList.add('fade-out');

  const cleanup = () => {
    if (isInDom(messageEl)) {
      messageEl.remove();
    }
    updateEmptyState();
  };

  messageEl.addEventListener('animationend', cleanup, { once: true });
  setTimeout(cleanup, FADE_DURATION_MS + 100);
}

function scheduleRemoval(messageEl, timestamp, fromHistory) {
  if (MESSAGE_LIFETIME_MS <= 0) return;

  const baseTime = fromHistory ? Date.now() : (timestamp || Date.now());
  const age = Date.now() - baseTime;
  const remaining = Math.max(0, MESSAGE_LIFETIME_MS - age);

  const timer = setTimeout(() => removeMessage(messageEl), remaining);
  messageTimers.set(messageEl, timer);
}

function trimMessagesToLimit() {
  if (!container) return;
  while (container.children.length > maxMessagesShown) {
    removeMessage(container.firstElementChild, true);
  }
}

function addMessage(data, fromHistory) {
  if (!template || !container) return;

  const clone = template.content.cloneNode(true);
  const messageEl = clone.querySelector('.chat-message');
  if (!messageEl) return;

  messageEl.classList.add('platform-' + data.platform);

  const badge = clone.querySelector('.platform-badge');
  badge.textContent = PLATFORM_LABELS[data.platform] || '?';

  const username = clone.querySelector('.username');
  username.textContent = data.username;
  username.style.color = data.color || '#ffffff';

  renderMessageContent(clone.querySelector('.message-text'), data);

  container.appendChild(messageEl);
  updateEmptyState();
  scheduleRemoval(messageEl, data.timestamp, fromHistory);
  trimMessagesToLimit();
}

function showDemoMessages() {
  const samples = [
    { platform: 'twitch', username: 'Viewer123', message: 'Salve! Chat funcionando!', color: '#9146FF' },
    { platform: 'kick', username: 'FanKick', message: 'Mensagem de teste do Kick', color: '#53FC18' },
    { platform: 'youtube', username: 'Inscrito', message: 'Hello from YouTube!', color: '#FF0000' },
  ];
  for (const msg of samples) {
    addMessage({ ...msg, timestamp: Date.now() }, false);
  }
  playNotificationSound();
}

function connect() {
  const ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    setStatus('connected');
    if (!soundForcedOff && notificationSoundEnabled) {
      getNotificationAudioTemplate().load();
    }
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);

      if (payload.type === 'history') {
        container.innerHTML = '';
        for (const msg of payload.data) {
          addMessage(msg, true);
        }
        if (payload.data.length === 0) {
          setStatus('connected');
        }
      } else if (payload.type === 'message') {
        addMessage(payload.data, false);
        // Som só quando o servidor autorizar (respeita o intervalo)
        if (payload.data && payload.data.playSound === true) {
          playNotificationSound(true);
        }
      } else if (payload.type === 'style') {
        applyStyleFromConfig(payload.data);
      }
    } catch {
      // ignora
    }
  };

  ws.onclose = () => {
    setStatus('disconnected');
    setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    setStatus('disconnected');
  };
}

connect();
updateEmptyState();

if (isDemo) {
  setTimeout(showDemoMessages, 500);
}
