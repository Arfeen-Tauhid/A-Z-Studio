import { ArrowDown, ArrowRight, ArrowUpRight, CirclePlay, Search } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Fragment, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { AutoScrollRow } from '../components/ui/AutoScrollRow'
import { ProjectCarousel } from '../components/ui/ProjectCarousel'
import { SectionHeading } from '../components/ui/SectionHeading'
import { VideoPlayer } from '../components/ui/VideoPlayer'
import {
  apiRequest,
  type PageResult,
  type Project,
  type SiteSettings,
  type StudioService,
} from '../lib/api'
import { projectAspectRatio, projectAspectRatios } from '../lib/projectMedia'
import { preloadRoute } from '../lib/routePreload'

const steps = [
  ['01', 'Listen & align', 'We get clear on your audience, goals, references, and deliverables.'],
  ['02', 'Shape the story', 'Your footage becomes a focused edit, built around what matters.'],
  ['03', 'Refine together', 'Thoughtful review rounds bring the details into focus.'],
  ['04', 'Ready to share', 'You receive finished exports, organized and ready for your channels.'],
]

export function HomePage() {
  const reducedMotion = useReducedMotion()
  const {
    replayIntro,
    settings,
    settingsUnavailable,
  } = useOutletContext<{
    replayIntro: () => void
    settings: SiteSettings
    settingsUnavailable: boolean
  }>()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectState, setProjectState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [services, setServices] = useState<StudioService[]>([])
  const [serviceState, setServiceState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([])
  const [proofState, setProofState] = useState<'loading' | 'ready' | 'error'>('loading')
  const homeHeadline = settings.homeHeadline || 'Ideas, shaped\ninto stories.'
  const homeDescription =
    settings.homeDescription ||
    'Thoughtful video editing, motion design, podcast production, and finishing for ambitious brands and creators across the United States, the Gulf region, and beyond.'
  const showreelUrl = settings.showreelUrl ?? ''
  const [inquiryNumber, setInquiryNumber] = useState('')
  const [inquiryStatus, setInquiryStatus] = useState('')
  const [inquiryError, setInquiryError] = useState('')
  const [checkingInquiry, setCheckingInquiry] = useState(false)
  const groupedProjects = projectAspectRatios
    .map((ratio) => ({
      ratio,
      projects: projects.filter((project) => projectAspectRatio(project) === ratio),
    }))
    .filter((group) => group.projects.length > 0)

  useEffect(() => {
    apiRequest<PageResult<Project>>('/api/public/projects?limit=50')
      .then((result) => {
        setProjects(result.items)
        setProjectState('ready')
      })
      .catch(() => setProjectState('error'))
  }, [])

  useEffect(() => {
    apiRequest<StudioService[]>('/api/public/services')
      .then((result) => {
        setServices(result.slice(0, 4))
        setServiceState('ready')
      })
      .catch(() => setServiceState('error'))
    apiRequest<{ _id: string; name: string }[]>('/api/public/clients')
      .then((clientItems) => {
        setClients(clientItems)
        setProofState('ready')
      })
      .catch(() => setProofState('error'))
  }, [])

  const [firstHeadlineLine, ...remainingHeadlineLines] = homeHeadline.split('\n')
  const headlineLines = [firstHeadlineLine, remainingHeadlineLines.join(' ')].filter(Boolean)

  function renderHeadlineWords(line: string, lineIndex: number, startIndex: number) {
    const words = line.split(/\s+/)
    return words.map((word, wordIndex) => (
      <Fragment key={`${lineIndex}-${wordIndex}`}>
        <span
          className={`hero-word${lineIndex > 0 ? ' hero-word-accent' : ''}`}
          style={{
            animationDelay: `${reducedMotion ? 0 : 0.12 + (startIndex + wordIndex) * 0.105}s`,
          }}
          data-motion={!reducedMotion}
          data-direction={wordIndex % 2 === 0 ? 'down' : 'up'}
        >
          {word}
        </span>
        {wordIndex < words.length - 1 ? ' ' : ''}
      </Fragment>
    ))
  }

  async function checkInquiryStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInquiryError('')
    setInquiryStatus('')
    setCheckingInquiry(true)
    try {
      const result = await apiRequest<{ inquiryNumber: string; status: string }>(
        `/api/public/inquiries/${encodeURIComponent(inquiryNumber)}`,
      )
      setInquiryStatus(result.status)
    } catch (error) {
      setInquiryError(
        error instanceof Error
          ? error.message
          : 'We could not find that inquiry. Please try again.',
      )
    } finally {
      setCheckingInquiry(false)
    }
  }

  return (
    <>
      <section className="hero shell">
        <div className="hero-top">
          <div className="hero-copy">
            <motion.span
              className="eyebrow hero-eyebrow"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : undefined}
            >
              VIDEO STORYTELLING, MADE WITH INTENTION
            </motion.span>
            <h1 aria-label={homeHeadline.replace(/\s+/g, ' ').trim()}>
              {headlineLines.map((line, lineIndex) => (
                <span
                  className={`hero-word-line${lineIndex > 0 ? ' hero-word-line-accent' : ''}`}
                  key={`${lineIndex}-${line}`}
                  aria-hidden="true"
                >
                  {renderHeadlineWords(
                    line,
                    lineIndex,
                    lineIndex === 0 ? 0 : (headlineLines[0]?.split(/\s+/).length ?? 0),
                  )}
                </span>
              ))}
            </h1>
            <motion.p
              className="hero-description"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }}
            >
              {homeDescription}
            </motion.p>
            {settingsUnavailable && (
              <p className="inline-error settings-warning">
                Custom site settings couldn’t be loaded; default studio copy is shown.
              </p>
            )}
            <motion.div
              className="hero-actions"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { delay: 0.28 }}
            >
              <Link
                className="button button-accent"
                to="/contact"
                onPointerEnter={() => preloadRoute('/contact')}
                onFocus={() => preloadRoute('/contact')}
              >
                Start a project <ArrowUpRight size={17} />
              </Link>
              <Link
                className="text-link"
                to="/work"
                onPointerEnter={() => preloadRoute('/work')}
                onFocus={() => preloadRoute('/work')}
              >
                Explore our work <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
          <button
            className="hero-intro-button"
            type="button"
            aria-label="Replay the studio intro"
            onClick={replayIntro}
          >
            <span className="hero-intro-disc" aria-hidden="true" />
            <span className="hero-intro-disc-center" aria-hidden="true">
              <CirclePlay size={27} />
              <span>INTRO</span>
            </span>
          </button>
        </div>
        <motion.div
          className="hero-art"
          aria-label="Cinematic landscape preview"
          initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.85, delay: 0.22 }}
        >
          {showreelUrl ? (
            <VideoPlayer
              className="hero-reel"
              source={showreelUrl}
              title="A Z Studios showreel"
              poster="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1500&q=85"
              controls={false}
              showSoundToggle={false}
            />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1500&q=85"
              alt=""
              fetchPriority="high"
            />
          )}
          <div className="hero-art-topline" aria-hidden="true">
            <span>AZ / VISUAL STORIES</span>
            <span className="hero-live-indicator">
              <i /> SHOWREEL
            </span>
          </div>
          <div className="hero-art-shade" />
          <div className="hero-art-label">
            <CirclePlay size={16} /> STORIES IN MOTION <span>EST. ON EVERY FRAME</span>
          </div>
          <div className="hero-edit-timeline" aria-hidden="true">
            <div className="hero-edit-timeline-heading">
              <span>AZ / SEQUENCE 01</span>
              <span>00:01:24:08</span>
            </div>
            <div className="hero-edit-ruler">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="hero-edit-track hero-edit-track-video">
              <span>V1</span>
              <i />
              <i />
              <i />
            </div>
            <div className="hero-edit-track hero-edit-track-audio">
              <span>A1</span>
              <i />
              <i />
            </div>
            <span className="hero-edit-playhead" />
          </div>
          <a className="hero-scroll" href="#work" aria-label="Scroll to selected work">
            <ArrowDown size={16} />
          </a>
        </motion.div>
        <motion.div
          className="hero-meta"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.5 }}
        >
          <span>STORY / EDIT / FINISH</span>
          <span>CREATIVE PARTNERS, WORLDWIDE</span>
        </motion.div>
      </section>

      <section className="selected-work section shell" id="work">
        <div className="section-topline">
          <SectionHeading
            label="SELECTED WORK"
            title="Made to move people."
            copy="A selection of the stories we have helped bring into focus."
          />
          <Link className="text-link desktop-link" to="/work">
            View all work <ArrowRight size={16} />
          </Link>
        </div>
        {projectState === 'loading' && (
          <div className="project-grid">
            {[1, 2, 3].map((item) => (
              <div className="project-skeleton" key={item} />
            ))}
          </div>
        )}
        {projectState === 'error' && (
          <p className="inline-error">
            Our work is temporarily unavailable. Please try again shortly.
          </p>
        )}
        {projectState === 'ready' &&
          projects.length > 0 &&
          groupedProjects.map(({ ratio, projects: ratioProjects }) => (
            <div className="work-project-row" key={ratio}>
              <ProjectCarousel
                projects={ratioProjects}
                ratio={ratio}
                label={`Selected ${ratio} project videos`}
              />
            </div>
          ))}
        {projectState === 'ready' && projects.length === 0 && (
          <div className="empty-work">
            <span>THE FIRST FRAME IS YOURS</span>
            <p>
              Our portfolio is being prepared. Get in touch to see if we’re the right fit for your
              next project.
            </p>
            <Link className="text-link" to="/contact">
              Tell us what you’re making <ArrowRight size={16} />
            </Link>
          </div>
        )}
        <Link className="text-link mobile-link" to="/work">
          View all work <ArrowRight size={16} />
        </Link>
      </section>

      <section className="services-band home-services-band">
        <div className="shell services-inner">
          <div className="services-intro">
            <span className="eyebrow">WHAT WE DO</span>
            <h2>
              Every detail
              <br />
              {' '}serves the story.
            </h2>
            <p>
              From social-first edits and podcasts to branded films, we shape each deliverable
              around your audience and goals.
            </p>
            <Link className="text-link" to="/services">
              Explore our services <ArrowRight size={16} />
            </Link>
            <div className="services-edit-note" aria-hidden="true">
              <span>THE EDIT BAY</span>
              <i />
              <span>PICTURE · SOUND · STORY</span>
            </div>
          </div>
          <div className="service-list">
            {serviceState === 'loading' && <p className="muted-copy">Loading services…</p>}
            {serviceState === 'error' && (
              <p className="inline-error">Services are temporarily unavailable.</p>
            )}
            {serviceState === 'ready' && services.length === 0 && (
              <p className="muted-copy">
                Tell us what you’re making and we’ll shape the right edit with you.
              </p>
            )}
            {services.map((service, index) => (
              <Link to="/services" className="service-row" key={service._id}>
                <span className="service-number">0{index + 1}</span>
                <span className="service-text">
                  <strong>{service.title}</strong>
                  <small>{service.description}</small>
                </span>
                <span className="service-waveform" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, bar) => (
                    <i key={bar} />
                  ))}
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="proof-section section shell">
        <div className="section-topline">
          <SectionHeading
            label="GOOD COMPANY"
            title="Good people. Good work."
            copy="A selection of client projects and creative partnerships, shared with permission."
          />
          <Link className="text-link desktop-link" to="/clients">
            Meet our clients <ArrowRight size={16} />
          </Link>
        </div>
        {proofState === 'error' && (
          <p className="inline-error">Approved client stories are temporarily unavailable.</p>
        )}
        {proofState === 'ready' && clients.length > 0 && (
          <AutoScrollRow
            items={clients.slice(0, 12)}
            label="Approved client projects and partnerships"
            className="auto-scroll-client-grid home-client-carousel"
            itemClassName="auto-scroll-item client-carousel-item"
            renderItem={(client, index) => {
              const isDemo = client.name.startsWith('DEMO ONLY')
              return (
                <article className="client-card home-client-card" key={client._id}>
                  {isDemo && <span className="demo-content-label">DEMO ONLY · SAMPLE ENTRY</span>}
                  <span className="home-client-index">CLIENT / {String(index + 1).padStart(2, '0')}</span>
                  <h2>{client.name}</h2>
                  <span className="home-client-meter" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </article>
              )
            }}
          />
        )}
        {proofState === 'ready' && clients.length === 0 && (
          <p className="muted-copy">
            Approved client profiles will appear here as they’re added to the studio portfolio.
          </p>
        )}
      </section>

      <section className="inquiry-tracker-section shell" aria-labelledby="inquiry-tracker-title">
        <div className="inquiry-tracker-copy">
          <span className="eyebrow">PROJECT INQUIRY</span>
          <h2 id="inquiry-tracker-title">A quick status check.</h2>
          <p>
            Enter the eight-digit reference number from your inquiry confirmation to see its latest
            status.
          </p>
          <div className="inquiry-status-steps" aria-hidden="true">
            <span>01 / RECEIVED</span>
            <i />
            <span>02 / IN THE EDIT</span>
            <i />
            <span>03 / DELIVERED</span>
          </div>
        </div>
        <form className="inquiry-tracker-form" onSubmit={checkInquiryStatus}>
          <label className="field">
            <span>Eight-digit inquiry number</span>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{8}"
              minLength={8}
              maxLength={8}
              value={inquiryNumber}
              onChange={(event) => {
                setInquiryNumber(event.target.value.replace(/\D/g, '').slice(0, 8))
                setInquiryError('')
                setInquiryStatus('')
              }}
              placeholder="e.g. 48273105"
              aria-label="Eight-digit inquiry number"
            />
          </label>
          <button className="button button-accent" type="submit" disabled={checkingInquiry}>
            {checkingInquiry ? 'Checking…' : 'Check status'} <Search size={16} />
          </button>
          {inquiryError && (
            <p className="form-error" role="alert">
              {inquiryError}
            </p>
          )}
          {inquiryStatus && (
            <p className="inquiry-status-result" role="status">
              Current status:{' '}
              <strong>
                {inquiryStatus === 'in_progress'
                  ? 'In progress'
                  : inquiryStatus === 'closed'
                    ? 'Closed'
                    : 'Received'}
              </strong>
            </p>
          )}
        </form>
      </section>

      <section className="approach section shell">
        <div className="home-process-heading">
          <SectionHeading
            label="HOW WE WORK"
            title={'A clear process.\nA better final cut.'}
            copy="No guesswork, no vanishing acts. Just a thoughtful partnership from first brief to final export."
          />
          <div className="home-process-status" aria-hidden="true">
            <span className="home-process-status-dot" />
            <span>YOUR PROJECT, IN GOOD HANDS</span>
          </div>
        </div>
        <div className="process-grid">
          {steps.map(([number, title, copy], index) => (
            <article className="process-step" key={number}>
              <div className="process-step-topline">
                <span>{number}</span>
                <span>SEQ / 0{index + 1}</span>
              </div>
              <div className={`process-step-clip process-step-clip-${index + 1}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="process-step-output">
                {['BRIEF', 'STORY', 'REFINE', 'EXPORT'][index]}
              </span>
            </article>
          ))}
        </div>
        <Link className="text-link" to="/process">
          More about our process <ArrowRight size={16} />
        </Link>
      </section>

      <section className="closing-cta">
        <div className="shell closing-inner">
          <span className="eyebrow">YOUR NEXT STORY STARTS HERE</span>
          <h2>
            Your next story
            <br />
            <em>starts here.</em>
          </h2>
          <Link className="button button-accent" to="/contact">
            Tell us about your project <ArrowUpRight size={17} />
          </Link>
          <span className="closing-orbit" aria-hidden="true">
            AZ
          </span>
        </div>
      </section>
    </>
  )
}
