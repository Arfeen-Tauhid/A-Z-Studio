import { useEffect, useState } from 'react'

type LoaderPhase = 'loading' | 'closing' | 'done'

export function SiteLoader() {
  const [phase, setPhase] = useState<LoaderPhase>(() =>
    window.location.pathname.startsWith('/admin') ? 'done' : 'loading',
  )

  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) return

    let isClosing = false
    let exitTimer = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const close = () => {
      if (isClosing) return
      isClosing = true
      setPhase('closing')
      exitTimer = window.setTimeout(() => setPhase('done'), reducedMotion ? 50 : 560)
    }

    const minimumTimer = window.setTimeout(close, reducedMotion ? 150 : 500)

    return () => {
      window.clearTimeout(minimumTimer)
      window.clearTimeout(exitTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`site-loader${phase === 'closing' ? ' is-closing' : ''}`}
      role="status"
      aria-label="Loading A Z Studios"
    >
      <div className="site-loader-inner">
        <div className="site-loader-topline">
          <span className="site-loader-wordmark">
            <span className="site-loader-mark">AZ</span>
            <span>A Z <span>STUDIOS</span></span>
          </span>
          <span className="site-loader-session">POST-PRODUCTION · EST. 2021</span>
        </div>

        <div className="site-loader-center">
          <div className="site-loader-monitor" aria-hidden="true">
            <div className="site-loader-monitor-bar">
              <span>PREVIEW MONITOR</span>
              <span>4K&nbsp; · &nbsp;24 FPS</span>
            </div>
            <div className="site-loader-frame">
              <span className="site-loader-shot site-loader-shot-one">
                <i className="site-loader-sun" />
                <i className="site-loader-horizon" />
                <i className="site-loader-landscape" />
              </span>
              <span className="site-loader-shot site-loader-shot-two">
                <i className="site-loader-shot-light" />
                <i className="site-loader-shot-building" />
              </span>
              <span className="site-loader-shot site-loader-shot-three">
                <i className="site-loader-shot-light" />
                <i className="site-loader-shot-mountain" />
              </span>
              <span className="site-loader-frame-vignette" />
              <span className="site-loader-frame-line" />
              <span className="site-loader-timecode">00:00:01:24</span>
              <span className="site-loader-frame-mark">PLAYING</span>
            </div>
          </div>
          <span className="site-loader-eyebrow">A LITTLE PATIENCE. A BETTER PICTURE.</span>
          <h1>
            Stories in <em>motion.</em>
          </h1>
          <p>Setting the scene for you.</p>
        </div>

        <div className="site-loader-timeline" aria-hidden="true">
          <div className="site-loader-ruler">
            <span>00:00</span>
            <span>00:05</span>
            <span>00:10</span>
            <span>00:15</span>
            <span>00:20</span>
            <span>00:25</span>
          </div>
          <div className="site-loader-tracks">
            <span className="site-loader-track-label">V1</span>
            <div className="site-loader-track site-loader-track-video">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="site-loader-track-label">A1</span>
            <div className="site-loader-track site-loader-track-audio">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="site-loader-playhead" />
          </div>
        </div>

        <div className="site-loader-footer">
          <span>CRAFTING YOUR FIRST FRAME</span>
          <span>FRAME BY FRAME <i /></span>
        </div>
      </div>
    </div>
  )
}
