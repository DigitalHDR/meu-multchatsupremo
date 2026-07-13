const params = new URLSearchParams(location.search);
const pathBase = location.pathname.replace(/\/$/, '');
const isChatFixoStreamer = pathBase.endsWith('/chatfixostremer');
const isPreview = params.has('preview') || isChatFixoStreamer;
const isDemo = params.has('demo');
const isObsChatFixo = isChatFixoStreamer || params.has('obschatfixo');
const soundEnabled = params.get('sound') !== '0';

const MESSAGE_LIFETIME_MS = (isDemo || isObsChatFixo) ? 600000 : 60000;
const MAX_MESSAGES = 30;
const FADE_DURATION_MS = 500;

const messageTimers = new WeakMap();

const NOTIFICATION_SOUND_URL = '/notification-som/notification.mp3';
let notificationAudioTemplate = null;

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
}

async function loadOverlayFontSize() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    applyStyleFromConfig(data.config);
  } catch {
    applyFontSize(isObsChatFixo ? 16 : 22);
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

function playNotificationSound() {
  if (!soundEnabled) return;

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

function removeMessage(messageEl) {
  const timer = messageTimers.get(messageEl);
  if (timer) {
    clearTimeout(timer);
    messageTimers.delete(messageEl);
  }

  if (!isInDom(messageEl)) return;

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

  if (!fromHistory) {
    playNotificationSound();
  }

  while (container.children.length > MAX_MESSAGES) {
    removeMessage(container.firstElementChild);
  }
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
}

function connect() {
  const ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    setStatus('connected');
    if (soundEnabled) {
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
