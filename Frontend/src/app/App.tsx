import { lazy, Suspense, useEffect, useRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'

function PointerAura() {
  const auraRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const aura = auraRef.current
    if (
      !aura ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    let frame = 0
    const moveAura = (event: PointerEvent) => {
      const { clientX, clientY } = event
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        aura.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`
        document.documentElement.classList.add('has-pointer-aura')
      })
    }
    const hideAura = () => document.documentElement.classList.remove('has-pointer-aura')

    window.addEventListener('pointermove', moveAura, { passive: true })
    window.addEventListener('pointerleave', hideAura)
    window.addEventListener('blur', hideAura)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', moveAura)
      window.removeEventListener('pointerleave', hideAura)
      window.removeEventListener('blur', hideAura)
      document.documentElement.classList.remove('has-pointer-aura')
    }
  }, [])

  return <div ref={auraRef} className="pointer-aura" aria-hidden="true" />
}

const AboutPage = lazy(() =>
  import('../pages/AboutPage').then((module) => ({ default: module.AboutPage })),
)
const BlogsPage = lazy(() =>
  import('../pages/BlogsPage').then((module) => ({ default: module.BlogsPage })),
)
const ClientsPage = lazy(() =>
  import('../pages/ClientsPage').then((module) => ({ default: module.ClientsPage })),
)
const ContactPage = lazy(() =>
  import('../pages/ContactPage').then((module) => ({ default: module.ContactPage })),
)
const HomePage = lazy(() =>
  import('../pages/HomePage').then((module) => ({ default: module.HomePage })),
)
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const PricingPage = lazy(() =>
  import('../pages/PricingPage').then((module) => ({ default: module.PricingPage })),
)
const ProcessPage = lazy(() =>
  import('../pages/ProcessPage').then((module) => ({ default: module.ProcessPage })),
)
const ProjectPage = lazy(() =>
  import('../pages/ProjectPage').then((module) => ({ default: module.ProjectPage })),
)
const ServicesPage = lazy(() =>
  import('../pages/ServicesPage').then((module) => ({ default: module.ServicesPage })),
)
const WorkPage = lazy(() =>
  import('../pages/WorkPage').then((module) => ({ default: module.WorkPage })),
)
const AdminPage = lazy(() =>
  import('../pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)

export function App() {
  return (
    <>
      <PointerAura />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="work" element={<WorkPage />} />
          <Route path="work/:slug" element={<ProjectPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="process" element={<ProcessPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="blogs" element={<BlogsPage />} />
          <Route path="blogs/:slug" element={<BlogsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<div className="shell page-shell">Loading admin…</div>}>
              <AdminPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<div className="shell page-shell">Loading admin…</div>}>
              <AdminPage />
            </Suspense>
          }
        />
      </Routes>
    </>
  )
}
