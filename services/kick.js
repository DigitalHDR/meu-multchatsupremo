const { createClient } = require('@retconned/kick-js');
const { parseKickParts } = require('../utils/messageParts');

function connectKick(channel, onMessage) {
  if (!channel) return null;

  const client = createClient(channel, { readOnly: true, logger: false, plainEmote: false });

  client.on('ready', () => {
    console.log(`[Kick] Conectado ao canal: ${channel}`);
  });

  client.on('ChatMessage', (message) => {
    const sender = message.sender || {};
    const content = (message.content || '').trim();
    const parts = parseKickParts(content);
    onMessage({
      platform: 'kick',
      username: sender.username || 'Anônimo',
      message: parts.map((p) => (p.type === 'text' ? p.value : p.alt)).join(''),
      parts,
      color: sender.identity?.color || '#53FC18',
      badges: {},
      timestamp: Date.now(),
    });
  });

  client.on('error', (err) => {
    console.error('[Kick] Erro:', err.message || err);
  });

  return client;
}

module.exports = { connectKick };
