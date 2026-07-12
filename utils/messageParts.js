function parseTwitchParts(message, emotesTag) {
  if (!emotesTag || Object.keys(emotesTag).length === 0) {
    return [{ type: 'text', value: message }];
  }

  const ranges = [];
  for (const [emoteId, positions] of Object.entries(emotesTag)) {
    for (const pos of positions) {
      const [start, end] = pos.split('-').map(Number);
      ranges.push({ start, end, emoteId });
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const parts = [];
  let index = 0;

  for (const range of ranges) {
    if (range.start > index) {
      parts.push({ type: 'text', value: message.slice(index, range.start) });
    }
    parts.push({
      type: 'emote',
      id: range.emoteId,
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${range.emoteId}/default/dark/2.0`,
      alt: message.slice(range.start, range.end + 1),
    });
    index = range.end + 1;
  }

  if (index < message.length) {
    parts.push({ type: 'text', value: message.slice(index) });
  }

  return parts.length ? parts : [{ type: 'text', value: message }];
}

function parseKickParts(content) {
  const parts = [];
  const regex = /\[emote:(\d+):(\w+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'emote',
      id: match[1],
      url: `https://files.kick.com/emotes/${match[1]}/fullsize`,
      alt: match[2],
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: content }];
}

function parseYouTubeParts(messageRuns) {
  if (!Array.isArray(messageRuns)) {
    return [{ type: 'text', value: String(messageRuns || '') }];
  }

  const parts = [];

  for (const run of messageRuns) {
    if (run.text !== undefined) {
      parts.push({ type: 'text', value: run.text });
      continue;
    }

    if (run.url) {
      parts.push({
        type: 'emote',
        url: run.url,
        alt: run.alt || run.emojiText || '',
      });
      continue;
    }

    if (run.emojiText || run.alt) {
      parts.push({ type: 'text', value: run.emojiText || run.alt });
    }
  }

  return parts.length ? parts : [{ type: 'text', value: '' }];
}

module.exports = { parseTwitchParts, parseKickParts, parseYouTubeParts };
