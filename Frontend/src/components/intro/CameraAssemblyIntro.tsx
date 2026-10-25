import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'

const CameraScene = lazy(() =>
  import('./CameraScene').then((module) => ({ default: module.CameraScene })),
)

type IntroPhase =
  | 'loading'
  | 'studio'
  | 'camera-reveal'
  | 'opening'
  | 'exploded'
  | 'assembling'
  | 'assembled'
  | 'branding'
  | 'camera-closeup'
  | 'fallback'

type Props = {
  onComplete: () => void
}

type BoundaryProps = { children: ReactNode; onError: () => void }
type BoundaryState = { hasError: boolean }

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError()
  }

  render() {
    return this.state.hasError ? null : this.props.children
  }
}

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export function CameraAssemblyIntro({ onComplete }: Props) {
  const prefersReducedMotion = useReducedMotion()
  const maxDuration = useRef<number | undefined>(undefined)
  const [webglAvailable] = useState(detectWebGL)
  const initialReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const initialFailure = !webglAvailable && !initialReducedMotion
  const [hasModel, setHasModel] = useState(false)
  const [failed, setFailed] = useState(initialFailure)
  const [phase, setPhase] = useState<IntroPhase>(
    initialFailure ? 'fallback' : initialReducedMotion ? 'branding' : 'loading',
  )
  const finish = useCallback(() => {
    window.clearTimeout(maxDuration.current)
    onComplete()
  }, [onComplete])

  useEffect(() => {
    maxDuration.current = window.setTimeout(finish, 24000)
    return () => window.clearTimeout(maxDuration.current)
  }, [finish])

  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = window.setTimeout(finish, 900)
      return () => window.clearTimeout(timer)
    }

    if (!webglAvailable) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 2500)
    Promise.all([
      fetch('/models/canon-at1/canon-at1.fbx', { method: 'HEAD', signal: controller.signal }),
      fetch('/models/studio/studio.fbx', { method: 'HEAD', signal: controller.signal }),
    ])
      .then(([cameraResponse, studioResponse]) => {
        if (controller.signal.aborted) return
        const isModelResponse = (response: Response) => {
          const contentType = response.headers.get('content-type') ?? ''
          return response.ok && !contentType.includes('text/html')
        }
        if (isModelResponse(cameraResponse) && isModelResponse(studioResponse)) {
          setHasModel(true)
          setPhase('opening')
        } else {
          setFailed(true)
          setPhase('fallback')
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setFailed(true)
        setPhase('fallback')
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [finish, prefersReducedMotion, webglAvailable])

  useEffect(() => {
    if (!failed) return
    const timer = window.setTimeout(finish, 3200)
    return () => window.clearTimeout(timer)
  }, [failed, finish])

  const skip = useCallback(() => finish(), [finish])
  const onScenePhase = useCallback((nextPhase: IntroPhase) => setPhase(nextPhase), [])
  const onSceneComplete = useCallback(() => finish(), [finish])
  const onSceneError = useCallback(() => {
    setFailed(true)
    setPhase('fallback')
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [skip])

  const showBranding = phase === 'branding' || phase === 'fallback'
  const reduced = prefersReducedMotion ?? false
  const story =
    phase === 'studio'
      ? {
          eyebrow: 'THE EDIT SUITE / 00',
          title: 'A space for stories.',
          description: 'Every detail is set for the moment the first frame rolls.',
          chapter: '01 — THE STUDIO',
        }
      : phase === 'camera-reveal'
        ? {
            eyebrow: 'ROLL CAMERA / 01',
            title: 'Find the frame.',
            description: 'A classic camera, ready to bring the scene into focus.',
            chapter: '02 — THE CAMERA',
          }
        : phase === 'exploded'
          ? {
              eyebrow: 'MECHANICAL PRECISION / 01',
              title: 'Every part has a purpose.',
              description:
                'Precision optics. Tactile controls. A classic, considered from the inside out.',
              chapter: '01 — THE DETAILS',
            }
          : phase === 'assembling'
            ? {
                eyebrow: 'CRAFT IN MOTION / 02',
                title: 'Shaping the story.',
                description: 'A hundred deliberate decisions, brought together in a single frame.',
                chapter: '02 — THE ASSEMBLY',
              }
            : phase === 'assembled'
              ? {
                  eyebrow: 'READY TO ROLL / 03',
                  title: 'Made with intention.',
                  description: 'Built to capture the moments that move people.',
                  chapter: '03 — THE FINISH',
                }
              : null

  return (
    <motion.div
      className="camera-intro"
      role="dialog"
      aria-modal="true"
      aria-label="A Z Studios introduction"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {hasModel && !failed && !reduced && (
        <SceneErrorBoundary onError={onSceneError}>
          <Suspense fallback={null}>
            <Canvas
              className="camera-intro-canvas"
              camera={{ position: [0, 0.12, 6], fov: 34 }}
              dpr={[1, 1]}
              gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
              onCreated={({ gl }) => {
                gl.setClearColor('#090d1a', 0)
              }}
              fallback={null}
            >
              <CameraScene onPhase={onScenePhase} onComplete={onSceneComplete} />
            </Canvas>
          </Suspense>
        </SceneErrorBoundary>
      )}

      <div className="camera-intro-grain" aria-hidden="true" />
      {failed && (
        <motion.div
          className="camera-intro-fallback-art"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1 }}
        >
          <span className="fallback-orbit fallback-orbit-one" />
          <span className="fallback-orbit fallback-orbit-two" />
          <span className="fallback-axis" />
          <span className="fallback-light" />
        </motion.div>
      )}
      <div className={`camera-intro-copy${showBranding ? ' is-branding' : ''}`}>
        {phase === 'loading' && (
          <span className="camera-intro-loading eyebrow">PREPARING THE STUDIO</span>
        )}
        {showBranding && (
          <AnimatePresence mode="wait">
            <motion.div
              className="camera-intro-brand"
              key="brand"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.25 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="camera-intro-monogram">AZ</span>
              <span className="camera-intro-wordmark">A Z STUDIOS</span>
              <span className="camera-intro-tagline">RAW FOOTAGE. REFINED STORIES.</span>
              {failed && (
                <span className="camera-intro-model-note">
                  Add the licensed camera model to enable the 3D assembly.
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {phase === 'camera-reveal' && (
        <div className="camera-intro-reveal" aria-hidden="true">
          <span className="camera-intro-reveal-ring" />
          <span className="camera-intro-reveal-inner" />
          <span className="camera-intro-reveal-crosshair" />
          <span className="camera-intro-reveal-label">50 MM / FRAME 001</span>
        </div>
      )}
      {story && (
        <AnimatePresence mode="wait">
          <motion.div
            className="camera-intro-story"
            key={phase}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <span className="camera-intro-story-eyebrow eyebrow">{story.eyebrow}</span>
            <h1>{story.title}</h1>
            <p>{story.description}</p>
            <span className="camera-intro-story-chapter">{story.chapter}</span>
          </motion.div>
        </AnimatePresence>
      )}
      <span className="camera-intro-caption" aria-live="polite">
        {story && (
          <>
            <span className="camera-intro-progress">
              <span className={phase === 'exploded' ? 'is-active' : 'is-complete'} />
              <span className={phase === 'exploded' ? '' : 'is-active'} />
              <span className={phase === 'assembled' ? 'is-active' : ''} />
            </span>
            {story.chapter}
          </>
        )}
      </span>
      <button className="camera-intro-skip" type="button" onClick={skip} autoFocus>
        Skip intro <span aria-hidden="true">↗</span>
      </button>
    </motion.div>
  )
}
