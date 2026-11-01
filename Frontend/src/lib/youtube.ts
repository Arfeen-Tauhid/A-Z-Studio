const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
])

export function youtubeVideoId(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !YOUTUBE_HOSTS.has(url.hostname))
    return null

  const videoId = url.hostname.endsWith('youtu.be')
    ? url.pathname.split('/').filter(Boolean)[0]
    : (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1])

  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null
}

export function youtubeThumbnailUrl(value: string) {
  const videoId = youtubeVideoId(value)
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined
}
