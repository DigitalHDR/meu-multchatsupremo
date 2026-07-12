const tmi = require('tmi.js');
const { parseTwitchParts } = require('../utils/messageParts');

function connectTwitch(channel, oauth, onMessage) {
  if (!channel) return null;

  const client = new tmi.Client({
    options: { debug: false },
    identity: oauth
      ? { username: channel, password: oauth.startsWith('oauth:') ? oauth : `oauth:${oauth}` }
      : undefined,
    channels: [channel.toLowerCase()],
  });

  client.on('message', (_channel, tags, message, self) => {
    if (self) return;
    const text = message.trim();
    onMessage({
      platform: 'twitch',
      username: tags['display-name'] || tags.username || 'Anônimo',
      message: text,
      parts: parseTwitchParts(text, tags.emotes),
      color: tags.color || '#9146FF',
      badges: tags.badges || {},
      timestamp: Date.now(),
    });
  });

  client.on('connected', () => {
    console.log(`[Twitch] Conectado ao canal: ${channel}`);
  });

  client.connect().catch((err) => {
    console.error('[Twitch] Erro ao conectar:', err.message);
  });

  return client;
}

module.exports = { connectTwitch };
