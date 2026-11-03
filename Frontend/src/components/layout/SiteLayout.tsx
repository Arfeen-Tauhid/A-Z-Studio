import { ArrowUpRight, Menu, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, type SiteSettings } from '../../lib/api'
import { preloadRoute } from '../../lib/routePreload'

const CameraAssemblyIntro = lazy(() =>
  import('../intro/CameraAssemblyIntro').then((module) => ({
    default: module.CameraAssemblyIntro,
  })),
)

const links = [
  { to: '/work', label: 'Work' },
  { to: '/services', label: 'Services' },
  { to: '/clients', label: 'Clients' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/about', label: 'About' },
  { to: '/process', label: 'Process' },
]
const currentYear = new Date().getFullYear()

export function SiteLayout() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({})
  const [settingsUnavailable, setSettingsUnavailable] = useState(false)
  const progressRef = useRef<HTMLSpanElement>(null)

  const completeIntro = useCallback(() => {
    setShowIntro(false)
  }, [])

  const replayIntro = useCallback(() => {
    setShowIntro(true)
    setMenuOpen(false)
    navigate('/')
  }, [navigate])

  useEffect(() => {
    apiRequest<SiteSettings>('/api/public/site-settings')
      .then(setSettings)
      .catch(() => setSettingsUnavailable(true))
  }, [])

  useEffect(() => {
    let frame = 0
    const updateProgress = () => {
      frame = 0
      const scrollableHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      const progress = scrollableHeight > 0 ? Math.min(window.scrollY / scrollableHeight, 1) : 0
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`
      }
    }
    const scheduleUpdate = () => {
      if (frame) return
      frame = requestAnimationFrame(updateProgress)
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    updateProgress()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion || location.pathname.startsWith('/admin')) return

    const selector = [
      '.page-intro',
      '.hero .hero-copy',
      '.section-heading h2',
      '.section-topline',
      '.services-inner > *',
      '.service-row',
      '.client-strip > *',
      '.inquiry-tracker-section > *',
      '.approach .process-grid > *',
      '.about-image',
      '.about-edit-card',
      '.about-image-caption',
      '.about-image-timecode',
      '.about-columns > div',
      '.about-values > *',
      '.service-principle',
      '.project-grid > *',
      '.services-page-grid > *',
      '.process-step',
      '.process-list-item',
      '.process-note',
      '.page-bottom-cta',
      '.client-card',
      '.testimonial-card',
      '.quote-panel',
      '.closing-inner',
      '.project-story',
      '.inquiry-form',
      '.blog-toolbar',
      '.blog-hero',
      '.blog-section',
      '.blog-card',
      '.blog-article',
      '.blog-author-area',
      '.services-list-heading',
      '.filter-list',
      '.empty-work',
      '.pagination',
      '.review-section',
      '.detail-cta',
      '.related-projects',
      '.form-success',
      '.pricing-note',
    ].join(',')
    const visibleElements = new WeakSet<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.matches('.section-heading h2')) {
            entry.target.classList.toggle('is-visible', entry.isIntersecting)
            if (entry.isIntersecting) visibleElements.add(entry.target)
            continue
          }
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          visibleElements.add(entry.target)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -36px 0px' },
    )

    const observeReveals = () => {
      document.querySelectorAll(`#main ${selector}`).forEach((element) => {
        if (visibleElements.has(element)) return
        element.classList.add('motion-reveal')
        observer.observe(element)
      })
    }

    document.documentElement.classList.add('motion-ready')
    observeReveals()
    const mutations = new MutationObserver(observeReveals)
    const main = document.querySelector('#main')
    if (main) mutations.observe(main, { childList: true, subtree: true })

    return () => {
      mutations.disconnect()
      observer.disconnect()
      document.documentElement.classList.remove('motion-ready')
      document.querySelectorAll('.motion-reveal').forEach((element) => {
        element.classList.remove('motion-reveal', 'is-visible')
      })
    }
  }, [location.pathname, prefersReducedMotion])

  useEffect(() => {
    if (!showIntro) return

    const previousOverflow = document.body.style.overflow
    const backgroundRegions = [
      document.querySelector<HTMLElement>('.site-header'),
      document.querySelector<HTMLElement>('#main'),
      document.querySelector<HTMLElement>('.site-footer'),
    ].filter((element): element is HTMLElement => element !== null)
    const originalInertStates = backgroundRegions.map((element) => element.inert)

    document.body.style.overflow = 'hidden'
    backgroundRegions.forEach((element) => {
      element.inert = true
    })

    return () => {
      document.body.style.overflow = previousOverflow
      backgroundRegions.forEach((element, index) => {
        element.inert = originalInertStates[index]
      })
    }
  }, [showIntro])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <span ref={progressRef} className="reading-progress" aria-hidden="true" />
        <div className="header-inner shell">
          <Link
            className="wordmark"
            to="/"
            aria-label="A Z Studios home"
            onPointerEnter={() => preloadRoute('/')}
            onFocus={() => preloadRoute('/')}
          >
            <span className="wordmark-mark">AZ</span>
            <span className="wordmark-copy">
              <span>A Z <span className="wordmark-light">STUDIOS</span></span>
              <small>EDIT <i>·</i> COLOR <i>·</i> SOUND</small>
            </span>
          </Link>
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                aria-label={link.label}
                onClick={() => setMenuOpen(false)}
                onPointerEnter={() => preloadRoute(link.to)}
                onFocus={() => preloadRoute(link.to)}
              >
                <span className="nav-key-cap" aria-hidden="true">{link.label.charAt(0)}</span>
                <span className="nav-key-label">{link.label}</span>
              </NavLink>
            ))}
            <NavLink
              className="admin-nav-link"
              to="/admin/login"
              aria-label="Admin login"
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-key-cap" aria-hidden="true">A</span>
              <span className="nav-key-label">Admin login</span>
            </NavLink>
            <Link
              className="nav-cta"
              to="/contact"
              onClick={() => setMenuOpen(false)}
              onPointerEnter={() => preloadRoute('/contact')}
              onFocus={() => preloadRoute('/contact')}
            >
              Start a project <ArrowUpRight size={15} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <Suspense
          fallback={
            <div className="shell page-shell">
              <span className="eyebrow">LOADING</span>
            </div>
          }
        >
          <Outlet context={{ replayIntro, settings, settingsUnavailable }} />
        </Suspense>
      </main>
      <footer className={`site-footer${isHomePage ? ' site-footer-home' : ''}`}>
        {isHomePage && (
          <div className="home-footer-outro shell" aria-label="A Z Studios end credits">
            <div className="home-footer-outro-meta">
              <span>A Z STUDIOS / END CREDITS</span>
              <span><i aria-hidden="true" /> FINAL EXPORT · 24 FPS</span>
            </div>
            <div className="home-footer-outro-copy">
              <h2>
                EVERY STORY
                <br />
                <em>GETS A LAST FRAME.</em>
              </h2>
              <span>Ours is just the beginning.</span>
            </div>
            <div className="home-footer-timeline" aria-hidden="true">
              <div className="home-footer-track">
                <span>V1</span>
                <div className="home-footer-clips">
                  <i>SELECTS</i>
                  <i>THE FINAL CUT</i>
                  <i>END CARD</i>
                </div>
              </div>
              <div className="home-footer-track">
                <span>A1</span>
                <div className="home-footer-audio">
                  {Array.from({ length: 42 }, (_, index) => (
                    <i key={index} />
                  ))}
                </div>
              </div>
              <span className="home-footer-playhead" />
            </div>
          </div>
        )}
        <div className="shell footer-top">
          <div>
            <Link className="wordmark footer-wordmark" to="/">
              <span className="wordmark-mark">AZ</span>
              <span>
                A Z <span className="wordmark-light">STUDIOS</span>
              </span>
            </Link>
            <p className="footer-note">Independent post-production for stories worth watching.</p>
          </div>
          <div className="footer-contact">
            <span className="eyebrow">HAVE A PROJECT IN MIND?</span>
            <Link to="/contact">
              Let’s make it matter <ArrowUpRight size={16} />
            </Link>
            {settings.studioEmail && (
              <a className="footer-email" href={`mailto:${settings.studioEmail}`}>
                {settings.studioEmail}
              </a>
            )}
            {settings.contactNumber && (
              <a
                className="footer-email"
                href={`tel:${settings.contactNumber.replace(/[^\d+]/g, '')}`}
              >
                {settings.contactNumber}
              </a>
            )}
            {settings.discordId && (
              <span className="footer-email">Discord: {settings.discordId}</span>
            )}
            <div className="footer-socials">
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
              {settings.youtubeUrl && (
                <a href={settings.youtubeUrl} target="_blank" rel="noreferrer">
                  YouTube
                </a>
              )}
              {settings.linkedinUrl && (
                <a href={settings.linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              )}
              {settings.whatsappUrl && (
                <a href={settings.whatsappUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
            {settingsUnavailable && (
              <span className="footer-settings-error">Studio contact links unavailable.</span>
            )}
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>© {currentYear} A Z Studios</span>
          <div>
            <Link
              to="/services"
              onPointerEnter={() => preloadRoute('/services')}
              onFocus={() => preloadRoute('/services')}
            >
              Services
            </Link>
            <Link
              to="/clients"
              onPointerEnter={() => preloadRoute('/clients')}
              onFocus={() => preloadRoute('/clients')}
            >
              Clients
            </Link>
            <Link
              to="/blogs"
              onPointerEnter={() => preloadRoute('/blogs')}
              onFocus={() => preloadRoute('/blogs')}
            >
              Blogs
            </Link>
            <Link
              to="/pricing"
              onPointerEnter={() => preloadRoute('/pricing')}
              onFocus={() => preloadRoute('/pricing')}
            >
              Pricing
            </Link>
            <Link
              to="/contact"
              onPointerEnter={() => preloadRoute('/contact')}
              onFocus={() => preloadRoute('/contact')}
            >
              Contact
            </Link>
          </div>
          <span>Made by Arfeen Tauhid</span>
          <button className="replay-intro" type="button" onClick={replayIntro}>
            Replay intro
          </button>
        </div>
      </footer>
      <AnimatePresence>
        {showIntro && location.pathname === '/' && (
          <Suspense
            fallback={
              <motion.div
                className="camera-intro editfilm-intro editfilm-loading"
                role="dialog"
                aria-modal="true"
                aria-label="A Z Studios: from raw footage to final cut"
                exit={{ opacity: 0 }}
              >
                <div className="editfilm-atmosphere" aria-hidden="true" />
                <header className="editfilm-header">
                  <span className="editfilm-brand-mark">AZ</span>
                  <span className="editfilm-brand-name">A Z STUDIOS <i>/ PICTURE EDIT</i></span>
                  <span className="editfilm-live"><i /> IN THE EDIT</span>
                </header>
                <section className="editfilm-story-copy">
                  <span className="editfilm-chapter"><i />01 / THE FOOTAGE</span>
                  <h1>Every story starts<br /><em>somewhere.</em></h1>
                  <p>Hours of raw footage. Every angle holds a possibility.</p>
                </section>
                <div className="editfilm-loading-frame" aria-hidden="true">
                  <span>PROGRAM / 00:00:12:08</span>
                  <i /><b /><em />
                  <div><i /><i /><i /><i /><i /><i /></div>
                  <span>V1　━━━━　A1　∿∿∿∿∿　A2　∿∿∿</span>
                </div>
                <footer className="editfilm-footer">
                  <span className="editfilm-timecode">00:00 <i>/ 01:03</i></span>
                  <div className="editfilm-progress" aria-hidden="true">
                    <span className="is-active" /><span /><span /><span /><span /><span /><span /><span /><span />
                  </div>
                  <span className="editfilm-footer-label">FROM RAW TO REMEMBERED</span>
                </footer>
                <button className="camera-intro-skip editfilm-skip" type="button" onClick={completeIntro}>
                  Skip intro <span aria-hidden="true">↗</span>
                </button>
              </motion.div>
            }
          >
            <CameraAssemblyIntro onComplete={completeIntro} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  )
}
