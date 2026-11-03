import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  onComplete: () => void
}

const editChapters = [
  {
    phase: 'ingest',
    timecode: '00:00',
    chapter: '01 / THE FOOTAGE',
    title: 'Every story starts',
    accent: 'somewhere.',
    note: 'Hours of raw footage. Every angle holds a possibility.',
  },
  {
    phase: 'selects',
    timecode: '00:07',
    chapter: '02 / THE SELECTS',
    title: 'Find the frame',
    accent: 'that feels true.',
    note: 'The glance between takes. The breath before the words.',
  },
  {
    phase: 'assembly',
    timecode: '00:14',
    chapter: '03 / THE ASSEMBLY',
    title: 'Shape the pieces',
    accent: 'into a pulse.',
    note: 'A wide. A close-up. A cut that carries us forward.',
  },
  {
    phase: 'cut',
    timecode: '00:21',
    chapter: '04 / THE CUT',
    title: 'Timing is',
    accent: 'everything.',
    note: 'Lose a beat. Hold a look. Let the moment land.',
  },
  {
    phase: 'sound',
    timecode: '00:28',
    chapter: '05 / THE SOUND',
    title: 'Make every',
    accent: 'word clear.',
    note: 'Dialogue up front. Music underneath. Space to breathe.',
  },
  {
    phase: 'grade',
    timecode: '00:35',
    chapter: '06 / THE GRADE',
    title: 'Give the feeling',
    accent: 'a color.',
    note: 'Shape the light. Find the skin tone. Make it yours.',
  },
  {
    phase: 'polish',
    timecode: '00:42',
    chapter: '07 / THE FINISH',
    title: 'One story.',
    accent: 'Every screen.',
    note: 'One considered cut, framed for every place it will live.',
  },
  {
    phase: 'export',
    timecode: '00:49',
    chapter: '08 / THE EXPORT',
    title: 'Ready to go',
    accent: 'where you go.',
    note: 'Clean masters. Thoughtful versions. Nothing left behind.',
  },
  {
    phase: 'final',
    timecode: '00:56',
    chapter: 'A Z STUDIOS / INDEPENDENT POST-PRODUCTION',
    title: 'Good stories',
    accent: 'deserve a great cut.',
    note: 'A Z Studios. From the first frame to the final feeling.',
  },
]

const CHAPTER_DURATION = 7000
const FILM_DURATION = CHAPTER_DURATION * editChapters.length
const waveform = [12, 20, 32, 17, 26, 42, 23, 16, 29, 48, 34, 22, 38, 17, 27, 44, 21, 33, 18, 40, 28, 16, 36, 24, 46, 19, 31, 14, 38, 27, 18, 43, 23, 35, 16, 29, 47, 21, 34, 15, 41, 25, 32, 18, 44, 27, 16, 37, 22, 48, 29, 17]
const musicWaveform = [7, 12, 17, 22, 27, 31, 34, 37, 39, 38, 36, 33, 29, 25, 22, 19, 17, 15, 14, 15, 18, 22, 27, 32, 37, 40, 42, 39, 35, 30, 25, 21, 18, 15, 13, 14, 17, 22, 29, 35, 40, 43, 39, 33, 27, 21, 17, 14, 12, 16, 23, 32]
const rawClips = [
  { label: 'CAM A · WIDE', time: 'A001_C014', look: 'wide' },
  { label: 'CAM B · CLOSE', time: 'B003_C008', look: 'close' },
  { label: 'CAM A · DETAIL', time: 'A001_C022', look: 'detail' },
  { label: 'CAM C · WALK', time: 'C002_C031', look: 'walk' },
  { label: 'CAM B · REACTION', time: 'B003_C019', look: 'reaction' },
  { label: 'CAM A · SUNSET', time: 'A001_C037', look: 'sunset' },
]

export function CameraAssemblyIntro({ onComplete }: Props) {
  const prefersReducedMotion = useReducedMotion()
  const [chapterIndex, setChapterIndex] = useState(0)
  const finish = useCallback(() => onComplete(), [onComplete])

  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = window.setTimeout(finish, 1200)
      return () => window.clearTimeout(timer)
    }

    const timers = editChapters.slice(1).map((_, index) =>
      window.setTimeout(() => setChapterIndex(index + 1), (index + 1) * CHAPTER_DURATION),
    )
    timers.push(window.setTimeout(finish, FILM_DURATION))
    return () => timers.forEach(window.clearTimeout)
  }, [finish, prefersReducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finish])

  const chapter = editChapters[chapterIndex]

  return (
    <motion.div
      className={`camera-intro editfilm-intro editfilm-phase-${chapter.phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="A Z Studios: from raw footage to final cut"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <div className="editfilm-atmosphere" aria-hidden="true" />
      <header className="editfilm-header">
        <span className="editfilm-brand-mark">AZ</span>
        <span className="editfilm-brand-name">A Z STUDIOS <i>/ PICTURE EDIT</i></span>
        <span className="editfilm-project">PROJECT 026 <i>·</i> 4K <i>·</i> 24 FPS</span>
        <span className="editfilm-live"><i /> IN THE EDIT</span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="editfilm-story-copy"
          key={chapter.phase}
          aria-live="polite"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 17 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -11 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.2, 0.75, 0.2, 1] }}
        >
          <span className="editfilm-chapter"><i />{chapter.chapter}</span>
          <h1>{chapter.title}<br /><em>{chapter.accent}</em></h1>
          <p>{chapter.note}</p>
        </motion.div>
      </AnimatePresence>

      <div className="editfilm-workbench" aria-hidden="true">
        <div className="editfilm-toolbar">
          <span className="editfilm-toolbar-dots"><i /><i /><i /></span>
          <span>AZ_STUDIOS / THE STORY / SEQUENCE_01</span>
          <span className="editfilm-toolbar-state">ALL CHANGES SAVED</span>
        </div>

        <section className="editfilm-media-bin">
          <div className="editfilm-panel-heading"><span>PROJECT MEDIA</span><b>06</b></div>
          <div className="editfilm-bin-folder">▾ <i>DAY_01 / SELECTS</i></div>
          <div className="editfilm-raw-grid">
            {rawClips.map((clip, index) => (
              <div className={`editfilm-raw-clip editfilm-raw-${clip.look}`} key={clip.time}>
                <div className="editfilm-mini-frame">
                  <i className="editfilm-mini-sun" />
                  <i className="editfilm-mini-ridge" />
                  <i className="editfilm-mini-person" />
                  {index === 1 && <span className="editfilm-select-check">✓</span>}
                </div>
                <span>{clip.time}</span>
              </div>
            ))}
          </div>
          <div className="editfilm-bin-footer"><i /> 6 CLIPS <b>·</b> 02:41:18</div>
        </section>

        <section className="editfilm-program">
          <div className="editfilm-program-bar">
            <span>PROGRAM</span>
            <span className="editfilm-program-time">00:00:12:08</span>
            <span>FIT <i>⌄</i></span>
          </div>
          <div className="editfilm-monitor-scene">
            <div className="editfilm-monitor-sky" />
            <div className="editfilm-monitor-sun" />
            <div className="editfilm-monitor-hills editfilm-monitor-hills-back" />
            <div className="editfilm-monitor-city" />
            <div className="editfilm-monitor-road" />
            <div className="editfilm-monitor-hills editfilm-monitor-hills-front" />
            <div className="editfilm-monitor-subject"><i /></div>
            <div className="editfilm-monitor-grain" />
            <div className="editfilm-monitor-grade-look" />
            <div className="editfilm-safe-frame"><i /><i /><i /><i /></div>
            <div className="editfilm-monitor-timecode">REC 00:01:24:08 <i>●</i></div>
            <div className="editfilm-monitor-caption">THE MOMENT BEFORE THE WORDS</div>
            <div className="editfilm-monitor-grade-split" />
            <div className="editfilm-monitor-grade-labels"><span>BEFORE</span><span>AFTER</span></div>
          </div>
        </section>

        <section className="editfilm-inspector">
          <div className="editfilm-panel-heading"><span className="editfilm-inspector-name">CLIP INFO</span><b>⌄</b></div>
          <div className="editfilm-inspector-thumb">
            <i className="editfilm-mini-sun" /><i className="editfilm-mini-ridge" /><i className="editfilm-mini-person" />
          </div>
          <div className="editfilm-inspector-title">A001_C014.MOV</div>
          <div className="editfilm-inspector-meta">3840 × 2160 <i>·</i> 23.98 FPS</div>
          <div className="editfilm-inspector-divider" />
          <div className="editfilm-inspector-controls">
            <span>EXPOSURE <i>+0.3</i></span>
            <b><i /></b>
            <span>CONTRAST <i>1.08</i></span>
            <b><i /></b>
            <span>VOICE CLARITY <i>+2.4 dB</i></span>
            <b><i /></b>
          </div>
          <div className="editfilm-eq-curve">
            <span>VOICE EQ / DYNAMICS</span>
            <svg viewBox="0 0 120 38" preserveAspectRatio="none">
              <path className="editfilm-eq-fill" d="M0 30 C14 30 18 28 27 23 S39 18 48 20 S62 22 71 14 S87 8 96 13 S109 20 120 12 L120 38 L0 38Z" />
              <path className="editfilm-eq-line" d="M0 30 C14 30 18 28 27 23 S39 18 48 20 S62 22 71 14 S87 8 96 13 S109 20 120 12" />
              <circle cx="27" cy="23" r="2" /><circle cx="71" cy="14" r="2" />
            </svg>
            <span className="editfilm-eq-values">80 Hz <i>·</i> -4 dB <i>·</i> 2.4 kHz</span>
          </div>
          <div className="editfilm-color-wheels">
            <div><i /></div><div><i /></div><div><i /></div>
          </div>
          <div className="editfilm-scopes"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="editfilm-scope-label">LUMA / RGB PARADE</div>
          <div className="editfilm-output-formats">
            <span>EXPORT FRAMES</span>
            <div>
              <i>16:9</i><i>9:16</i><i>1:1</i><i>4:5</i>
            </div>
          </div>
        </section>

        <section className="editfilm-timeline">
          <div className="editfilm-timeline-toolbar">
            <span>SEQUENCE_01 <i>⌄</i></span>
            <span className="editfilm-timeline-tools">↖　✂　⌕　◧　♪</span>
            <span>00:00:56:00</span>
          </div>
          <div className="editfilm-ruler"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="editfilm-track editfilm-track-v2">
            <span>V2</span>
            <div className="editfilm-track-content"><i /><i /><i className="editfilm-title-clip" /><i /></div>
          </div>
          <div className="editfilm-track editfilm-track-v1">
            <span>V1</span>
            <div className="editfilm-track-content">
              <i className="editfilm-video-clip editfilm-clip-one" />
              <i className="editfilm-video-clip editfilm-clip-two" />
              <i className="editfilm-video-clip editfilm-clip-three" />
              <i className="editfilm-video-clip editfilm-clip-four" />
              <i className="editfilm-video-clip editfilm-clip-five" />
            </div>
          </div>
          <div className="editfilm-track editfilm-track-a1">
            <span>A1</span>
            <div className="editfilm-track-content">
              {waveform.map((height, index) => <i key={`dialogue-${index}`} style={{ height: `${height}%` }} />)}
            </div>
          </div>
          <div className="editfilm-track editfilm-track-a2">
            <span>A2</span>
            <div className="editfilm-track-content">
              {musicWaveform.map((height, index) => <i key={`music-${index}`} style={{ height: `${height}%` }} />)}
            </div>
          </div>
          <div className="editfilm-playhead"><i /></div>
          <div className="editfilm-cut-flash" />
          <div className="editfilm-audio-meter"><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </section>
      </div>

      <footer className="editfilm-footer">
        <span className="editfilm-timecode">{chapter.timecode} <i>/ 01:03</i></span>
        <div className="editfilm-progress">
          {editChapters.map((item, index) => (
            <span className={index === chapterIndex ? 'is-active' : index < chapterIndex ? 'is-past' : ''} key={item.phase} />
          ))}
        </div>
        <span className="editfilm-footer-label">FROM RAW TO REMEMBERED</span>
      </footer>

      <button className="camera-intro-skip editfilm-skip" type="button" onClick={finish} autoFocus>
        Skip intro <span aria-hidden="true">↗</span>
      </button>
    </motion.div>
  )
}
