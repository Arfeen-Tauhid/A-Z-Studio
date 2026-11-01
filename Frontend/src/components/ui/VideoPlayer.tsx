import { ExternalLink, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const playerRef = useRef<HTMLDivElement>(null)
  const [audio, setAudio] = useState({ source, muted: true })
  const [playbackError, setPlaybackError] = useState('')
  const [nearViewportSource, setNearViewportSource] = useState<string | null>(null)
  const isNearViewport =
    typeof IntersectionObserver === 'undefined' || nearViewportSource === source
  const muted = audio.source === source ? audio.muted : true
  const youtubeId = youtubeVideoId(source)

  useEffect(() => {
    const player = playerRef.current
    if (!player || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => setNearViewportSource(entry.isIntersecting ? source : null),
      { rootMargin: '300px 0px' },
    )
    observer.observe(player)
    return () => observer.disconnect()
  }, [source])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isNearViewport) {
      void video.play().catch(() => {
        setPlaybackError('Playback could not start. Use the video controls to try again.')
      })
    } else {
      video.pause()
    }
  }, [isNearViewport, source, youtubeId])

  function toggleSound() {
    const nextMuted = !muted
    setPlaybackError('')
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
      const video = videoRef.current
      video.volume = 1
      video.muted = nextMuted
      if (!nextMuted) {
        void video.play().catch(() => {
          video.muted = true
          setAudio({ source, muted: true })
          setPlaybackError('Playback could not start. Use the video controls to try again.')
        })
      }
    }
  }

  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&controls=${controls ? 1 : 0}&loop=1&playlist=${youtubeId}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : undefined

  return (
    <div ref={playerRef} className={`video-player ${className}`.trim()}>
      {embedUrl ? (
        isNearViewport ? (
          <>
            <iframe
              ref={iframeRef}
              className="video-player-frame"
              src={embedUrl}
              title={title}
              loading="lazy"
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
          <div className="video-player-frame" aria-label={`${title} video loads when nearby`} />
        )
      ) : (
        <video
          ref={videoRef}
          className="video-player-frame"
          autoPlay={isNearViewport}
          controls={controls}
          controlsList="nodownload"
          loop
          muted={muted}
          playsInline
          preload={isNearViewport ? 'metadata' : 'none'}
          src={isNearViewport ? source : undefined}
          aria-label={title}
          onVolumeChange={(event) => setAudio({ source, muted: event.currentTarget.muted })}
        >
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
      {playbackError && (
        <span className="video-playback-error" role="status">
          {playbackError}
        </span>
      )}
    </div>
  )
}
