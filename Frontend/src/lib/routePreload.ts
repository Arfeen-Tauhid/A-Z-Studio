const routeLoaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/HomePage'),
  '/work': () => import('../pages/WorkPage'),
  '/services': () => import('../pages/ServicesPage'),
  '/clients': () => import('../pages/ClientsPage'),
  '/about': () => import('../pages/AboutPage'),
  '/process': () => import('../pages/ProcessPage'),
  '/pricing': () => import('../pages/PricingPage'),
  '/contact': () => import('../pages/ContactPage'),
  '/work/:slug': () => import('../pages/ProjectPage'),
}

export function preloadRoute(pathname: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const route = normalizedPath.startsWith('/work/') ? '/work/:slug' : normalizedPath
  const load = routeLoaders[route]
  if (load) void load().catch(() => undefined)
}
