import { ExternalLink, Volume2, VolumeX } from 'lucide-react'
import { useRef, useState } from 'react'
import { youtubeVideoId } from '../../lib/youtube'

export function VideoPlayer({
  source,
  title,
  className = '',
  controls = true,
}: {
  source: string
  title: string
  className?: string
  controls?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [audio, setAudio] = useState({ source, muted: true })
  const muted = audio.source === source ? audio.muted : true
  const youtubeId = youtubeVideoId(source)

  function toggleSound() {
    const nextMuted = !muted
    setAudio({ source, muted: nextMuted })
    if (youtubeId) {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextMuted ? 'mute' : 'unMute',
          args: [],
        }),
        '*',
      )
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted
    }
  }

  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&controls=${controls ? 1 : 0}&loop=1&playlist=${youtubeId}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : undefined

  return (
    <div className={`video-player ${className}`.trim()}>
      {embedUrl ? (
        <>
          <iframe
            ref={iframeRef}
            className="video-player-frame"
            src={embedUrl}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <a
            className="video-youtube-link"
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${title} on YouTube`}
          >
            Open on YouTube <ExternalLink size={13} />
          </a>
        </>
      ) : (
        <video
          ref={videoRef}
          className="video-player-frame"
          autoPlay
          controls={controls}
          controlsList="nodownload"
          loop
          muted={muted}
          playsInline
          preload="metadata"
          aria-label={title}
          onVolumeChange={(event) => setAudio({ source, muted: event.currentTarget.muted })}
        >
          <source src={source} />
          Your browser does not support video playback.
        </video>
      )}
      <button
        className="video-sound-toggle"
        type="button"
        onClick={toggleSound}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        aria-pressed={!muted}
        title={muted ? 'Turn sound on' : 'Mute sound'}
      >
        {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
    </div>
  )
}
