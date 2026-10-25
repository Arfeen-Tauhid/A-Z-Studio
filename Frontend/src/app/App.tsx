import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'

const AboutPage = lazy(() =>
  import('../pages/AboutPage').then((module) => ({ default: module.AboutPage })),
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
    <Suspense
      fallback={
        <div className="shell page-shell">
          <span className="eyebrow">LOADING</span>
        </div>
      }
    >
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
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/login" element={<AdminPage />} />
      </Routes>
    </Suspense>
  )
}
