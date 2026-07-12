const { LiveChat } = require('youtube-chat');
const { parseYouTubeParts } = require('../utils/messageParts');

async function getLiveVideoIdFromChannel(channel) {
  const handle = channel.replace(/^@/, '');
  const url = `https://www.youtube.com/@${handle}/live`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Canal YouTube não encontrado: @${handle}`);
  }

  const html = await res.text();

  if (html.includes('OFFLINE') || html.includes('"isLive":false') || html.includes('Nenhuma transmissão')) {
    throw new Error(`Canal @${handle} não está ao vivo no momento`);
  }

  const liveMatch = html.match(/"isLive":true[\s\S]{0,500}?"videoId":"([a-zA-Z0-9_-]{11})"/);
  if (liveMatch) return liveMatch[1];

  const watchMatch = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  throw new Error(`Nenhuma live ativa no canal @${handle}`);
}

function connectYouTubeLive(videoId, onMessage) {
  const liveChat = new LiveChat({ liveId: videoId });

  liveChat.on('chat', (chatItem) => {
    const author = chatItem.author || {};
    const messageRuns = chatItem.message;

    if (!messageRuns || (Array.isArray(messageRuns) && messageRuns.length === 0)) return;

    const parts = parseYouTubeParts(messageRuns);
    const hasContent = parts.some(
      (p) => (p.type === 'text' && p.value) || (p.type === 'emote' && p.url)
    );

    if (!hasContent) return;

    const plainText = parts
      .map((p) => (p.type === 'text' ? p.value : p.alt || ''))
      .join('')
      .trim() || 'emote';

    onMessage({
      platform: 'youtube',
      username: author.name || 'Anônimo',
      message: plainText,
      parts,
      color: '#FF0000',
      badges: {},
      timestamp: Date.now(),
    });
  });

  liveChat.on('error', (err) => {
    console.error('[YouTube] Erro:', err.message || err);
  });

  return liveChat;
}

async function connectYouTube(videoIdOrChannel, onMessage) {
  if (!videoIdOrChannel) return null;

  let videoId = videoIdOrChannel;

  if (videoIdOrChannel.startsWith('@') || !/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrChannel)) {
    const channel = videoIdOrChannel.replace(/^@/, '');
    try {
      videoId = await getLiveVideoIdFromChannel(channel);
      console.log(`[YouTube] Live encontrada no canal @${channel}: ${videoId}`);
    } catch (err) {
      console.error('[YouTube]', err.message);
      return null;
    }
  }

  const liveChat = connectYouTubeLive(videoId, onMessage);

  liveChat
    .start()
    .then((ok) => {
      if (ok) {
        console.log(`[YouTube] Conectado ao vídeo: ${videoId}`);
      } else {
        console.error('[YouTube] Não foi possível iniciar o chat. Verifique se o vídeo está ao vivo.');
      }
    })
    .catch((err) => {
      console.error('[YouTube] Falha ao conectar:', err.message);
    });

  return liveChat;
}

module.exports = { connectYouTube, getLiveVideoIdFromChannel };
