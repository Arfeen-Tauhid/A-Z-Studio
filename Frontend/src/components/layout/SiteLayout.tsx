import { ArrowUpRight, Menu, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
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
  { to: '/about', label: 'About' },
  { to: '/process', label: 'Process' },
]
const currentYear = new Date().getFullYear()

export function SiteLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({})
  const [settingsUnavailable, setSettingsUnavailable] = useState(false)

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
    if (prefersReducedMotion || location.pathname.startsWith('/admin')) return

    const selector = [
      '.page-intro',
      '.section-topline',
      '.project-grid > *',
      '.services-page-grid > *',
      '.process-step',
      '.client-card',
      '.testimonial-card',
      '.quote-panel',
      '.closing-inner',
      '.project-story',
      '.inquiry-form',
    ].join(',')
    const visibleElements = new WeakSet<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
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
        <div className="header-inner shell">
          <Link
            className="wordmark"
            to="/"
            aria-label="A Z Studios home"
            onPointerEnter={() => preloadRoute('/')}
            onFocus={() => preloadRoute('/')}
          >
            <span className="wordmark-mark">AZ</span>
            <span>
              A Z <span className="wordmark-light">STUDIOS</span>
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
                onClick={() => setMenuOpen(false)}
                onPointerEnter={() => preloadRoute(link.to)}
                onFocus={() => preloadRoute(link.to)}
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink
              className="admin-nav-link"
              to="/admin/login"
              onClick={() => setMenuOpen(false)}
            >
              Admin login
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
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
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
              <motion.div className="camera-intro camera-intro-loading" exit={{ opacity: 0 }}>
                <span className="eyebrow">A Z STUDIOS / INTRODUCTION</span>
                <button className="camera-intro-skip" type="button" onClick={completeIntro}>
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
