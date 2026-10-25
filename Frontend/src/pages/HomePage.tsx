import { ArrowDown, ArrowRight, ArrowUpRight, CirclePlay, Search } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectCard } from '../components/ui/ProjectCard'
import { SectionHeading } from '../components/ui/SectionHeading'
import {
  apiRequest,
  type PageResult,
  type Project,
  type SiteSettings,
  type StudioService,
} from '../lib/api'

const steps = [
  ['01', 'Listen & align', 'We get clear on your audience, goals, references, and deliverables.'],
  ['02', 'Shape the story', 'Your footage becomes a focused edit, built around what matters.'],
  ['03', 'Refine together', 'Thoughtful review rounds bring the details into focus.'],
  ['04', 'Ready to share', 'You receive finished exports, organized and ready for your channels.'],
]

export function HomePage() {
  const reducedMotion = useReducedMotion()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectState, setProjectState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [services, setServices] = useState<StudioService[]>([])
  const [serviceState, setServiceState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([])
  const [proofState, setProofState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [homeHeadline, setHomeHeadline] = useState('Ideas, shaped\ninto stories.')
  const [homeDescription, setHomeDescription] = useState(
    'Thoughtful video editing, motion design, podcast production, and finishing for ambitious brands and creators across the United States, the Gulf region, and beyond.',
  )
  const [showreelUrl, setShowreelUrl] = useState('')
  const [settingsError, setSettingsError] = useState(false)
  const [inquiryNumber, setInquiryNumber] = useState('')
  const [inquiryStatus, setInquiryStatus] = useState('')
  const [inquiryError, setInquiryError] = useState('')
  const [checkingInquiry, setCheckingInquiry] = useState(false)

  useEffect(() => {
    apiRequest<PageResult<Project>>('/api/public/projects?limit=3')
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
    apiRequest<SiteSettings>('/api/public/site-settings')
      .then((settings) => {
        if (settings.homeHeadline) setHomeHeadline(settings.homeHeadline)
        if (settings.homeDescription) setHomeDescription(settings.homeDescription)
        if (settings.showreelUrl) setShowreelUrl(settings.showreelUrl)
      })
      .catch(() => setSettingsError(true))
  }, [])

  const [firstHeadlineLine, ...remainingHeadlineLines] = homeHeadline.split('\n')

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
        <div className="hero-copy">
          <motion.span
            className="eyebrow hero-eyebrow"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : undefined}
          >
            VIDEO STORYTELLING, MADE WITH INTENTION
          </motion.span>
          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.08 }}
          >
            {firstHeadlineLine}
            <br />
            <span>{remainingHeadlineLines.join(' ')}</span>
          </motion.h1>
          <motion.p
            className="hero-description"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }}
          >
            {homeDescription}
          </motion.p>
          {settingsError && (
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
            <Link className="button button-accent" to="/contact">
              Start a project <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" to="/work">
              Explore our work <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
        <div className="hero-art" aria-label="Cinematic landscape preview">
          {showreelUrl ? (
            <video
              className="hero-reel"
              controls
              playsInline
              preload="none"
              aria-label="A Z Studios showreel"
            >
              <source src={showreelUrl} />
            </video>
          ) : (
            <img
              src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1500&q=85"
              alt=""
              fetchPriority="high"
            />
          )}
          <div className="hero-art-shade" />
          <div className="hero-art-label">
            <CirclePlay size={16} /> STORIES IN MOTION <span>EST. ON EVERY FRAME</span>
          </div>
          <div className="hero-frame-count">
            01 <span>/</span> 04
          </div>
          <a className="hero-scroll" href="#work" aria-label="Scroll to selected work">
            <ArrowDown size={16} />
          </a>
        </div>
        <div className="hero-meta">
          <span>STORY / EDIT / FINISH</span>
          <span>CREATIVE PARTNERS, WORLDWIDE</span>
        </div>
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
        {projectState === 'ready' && projects.length > 0 && (
          <div className="project-grid">
            {projects.map((project, index) => (
              <ProjectCard key={project._id} project={project} index={index} />
            ))}
          </div>
        )}
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

      <section className="services-band">
        <div className="shell services-inner">
          <div className="services-intro">
            <span className="eyebrow">WHAT WE DO</span>
            <h2>
              Every detail
              <br />
              serves the story.
            </h2>
            <p>
              From social-first edits and podcasts to branded films, we shape each deliverable
              around your audience and goals.
            </p>
            <Link className="text-link" to="/services">
              Explore our services <ArrowRight size={16} />
            </Link>
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
          <div className="client-strip" aria-label="Approved clients">
            {clients.slice(0, 6).map((client) => (
              <span key={client._id}>{client.name}</span>
            ))}
          </div>
        )}
        {proofState === 'ready' && clients.length === 0 && (
          <p className="muted-copy">
            Approved client profiles will appear here as they’re added to the studio portfolio.
          </p>
        )}
      </section>

      <section className="inquiry-tracker-section shell" aria-labelledby="inquiry-tracker-title">
        <div>
          <span className="eyebrow">PROJECT INQUIRY</span>
          <h2 id="inquiry-tracker-title">A quick status check.</h2>
          <p>
            Enter the eight-digit reference number from your inquiry confirmation to see its latest
            status.
          </p>
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
        <SectionHeading
          label="HOW WE WORK"
          title={'A clear process.\nA better final cut.'}
          copy="No guesswork, no vanishing acts. Just a thoughtful partnership from first brief to final export."
        />
        <div className="process-grid">
          {steps.map(([number, title, copy]) => (
            <article className="process-step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
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
