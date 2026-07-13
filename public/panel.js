const form = document.getElementById('config-form');
const portGrid = document.getElementById('port-grid');
const overlayUrl = document.getElementById('overlay-url');
const toast = document.getElementById('toast');

let selectedPort = location.port || '3847';

function showToast(message, type) {
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('hidden'), 6000);
}

function updateOverlayUrl(port) {
  overlayUrl.textContent = `${location.protocol}//${location.hostname}:${port}/overlaypublico`;
}

function renderPorts(ports) {
  portGrid.innerHTML = '';

  for (const item of ports) {
    const label = document.createElement('label');
    label.className = 'port-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'PORT';
    input.value = String(item.port);
    input.checked = item.port === Number(selectedPort);
    input.disabled = !item.available;

    const card = document.createElement('div');
    card.className = 'port-card';

    const number = document.createElement('span');
    number.className = 'port-number';
    number.textContent = item.port;

    const status = document.createElement('span');
    status.className = 'port-status';

    if (item.current) {
      status.classList.add('active');
      status.textContent = 'Ativa agora';
    } else if (item.inUse) {
      status.classList.add('busy');
      status.textContent = 'Em uso';
    } else {
      status.classList.add('free');
      status.textContent = 'Livre';
    }

    card.appendChild(number);
    card.appendChild(status);
    label.appendChild(input);
    label.appendChild(card);
    portGrid.appendChild(label);

    input.addEventListener('change', () => {
      if (input.checked) {
        selectedPort = input.value;
        updateOverlayUrl(selectedPort);
      }
    });
  }
}

function fillForm(config) {
  form.TWITCH_CHANNEL.value = config.TWITCH_CHANNEL || '';
  form.KICK_CHANNEL.value = config.KICK_CHANNEL || '';
  form.YOUTUBE_CHANNEL.value = config.YOUTUBE_CHANNEL || '';
  form.YOUTUBE_VIDEO_ID.value = config.YOUTUBE_VIDEO_ID || '';
  form.TWITCH_OAUTH.value = config.TWITCH_OAUTH || '';
  selectedPort = config.PORT || selectedPort;
  updateOverlayUrl(selectedPort);
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    fillForm(data.config);
    renderPorts(data.ports);
  } catch {
    showToast('Não foi possível carregar a configuração.', 'error');
  }
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    setPlatformStatus('st-twitch', data.twitch);
    setPlatformStatus('st-kick', data.kick);
    setPlatformStatus('st-youtube', data.youtube);

    if (data.port) {
      selectedPort = String(data.port);
      updateOverlayUrl(selectedPort);
    }
  } catch {
    // servidor offline
  }
}

function setPlatformStatus(id, channel) {
  const el = document.getElementById(id);
  if (channel) {
    el.innerHTML = `${channel}<br><span class="badge on">Ativo</span>`;
  } else {
    el.innerHTML = `Não configurado<br><span class="badge off">Inativo</span>`;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const portInput = form.querySelector('input[name="PORT"]:checked');
  if (!portInput) {
    showToast('Selecione uma porta disponível.', 'error');
    return;
  }

  const body = {
    PORT: portInput.value,
    TWITCH_CHANNEL: form.TWITCH_CHANNEL.value.trim(),
    KICK_CHANNEL: form.KICK_CHANNEL.value.trim(),
    YOUTUBE_CHANNEL: form.YOUTUBE_CHANNEL.value.trim(),
    YOUTUBE_VIDEO_ID: form.YOUTUBE_VIDEO_ID.value.trim(),
    TWITCH_OAUTH: form.TWITCH_OAUTH.value.trim(),
  };

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Erro ao salvar.', 'error');
      return;
    }

    showToast(data.message, 'success');
    await loadConfig();
  } catch {
    showToast('Erro ao salvar configuração.', 'error');
  }
});

document.getElementById('btn-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(overlayUrl.textContent);
  showToast('URL copiada!', 'success');
});

document.getElementById('btn-test').addEventListener('click', async () => {
  await fetch('/api/test-message');
  showToast('Mensagem de teste enviada! Abra o overlay.', 'success');
});

loadConfig();
loadStatus();
setInterval(loadStatus, 10000);
setInterval(loadConfig, 15000);
