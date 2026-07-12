function parseTwitchChannel(value) {
  if (!value) return '';
  const v = value.trim();
  const match = v.match(/(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([^/?#]+)/i);
  return (match ? match[1] : v).toLowerCase();
}

function parseKickChannel(value) {
  if (!value) return '';
  const v = value.trim();
  const match = v.match(/(?:https?:\/\/)?(?:www\.)?kick\.com\/([^/?#]+)/i);
  return (match ? match[1] : v).toLowerCase();
}

function parseYouTubeVideoId(value) {
  if (!value) return '';
  const v = value.trim();
  const studioMatch = v.match(/studio\.youtube\.com\/video\/([^/?#]+)/i);
  if (studioMatch) return studioMatch[1];
  const watchMatch = v.match(/[?&]v=([^&]+)/i);
  if (watchMatch) return watchMatch[1];
  const shortMatch = v.match(/youtu\.be\/([^/?#]+)/i);
  if (shortMatch) return shortMatch[1];
  if (/^[\w-]{11}$/.test(v)) return v;
  return '';
}

function parseYouTubeChannel(value) {
  if (!value) return '';
  const v = value.trim();
  const channelMatch = v.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^/?#]+)/i);
  if (channelMatch) return '@' + channelMatch[1];
  if (v.startsWith('@')) return v;
  return '';
}

function parseYouTubeInput(videoIdValue, channelValue) {
  const videoId = parseYouTubeVideoId(videoIdValue);
  if (videoId) return videoId;
  return parseYouTubeChannel(channelValue || videoIdValue);
}

module.exports = {
  parseTwitchChannel,
  parseKickChannel,
  parseYouTubeVideoId,
  parseYouTubeChannel,
  parseYouTubeInput,
};
