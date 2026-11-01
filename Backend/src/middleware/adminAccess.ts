export type AdminRole = 'owner' | 'full' | 'limited' | 'custom'

export type AdminPermission =
  | 'projects'
  | 'clients'
  | 'testimonials'
  | 'services'
  | 'site-settings'
  | 'inquiries'
  | 'ratings'
  | 'create-admins'
  | 'activity'
  | 'blog-writing-requests'
  | 'blog-writers'
  | 'blog-post-review'

export function canAccessAdminPath(
  role: AdminRole,
  permissions: string[],
  method: string,
  path: string,
  resourceType?: string,
) {
  if (role === 'owner') return true
  if (path === '/admins') return method === 'POST' && permissions.includes('create-admins')
  if (path === '/activity') return method === 'GET' && permissions.includes('activity')
  if (role === 'full') return true
  if (role === 'limited') {
    if (path === '/dashboard' && method === 'GET') return true
    if (
      ['/uploads/signature', '/uploads/verify'].includes(path) &&
      method === 'POST' &&
      (resourceType === 'image' || resourceType === 'video')
    ) {
      return true
    }
    const [legacyResource] = path.replace(/^\/+/, '').split('/')
    if (['projects', 'services'].includes(legacyResource))
      return ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)
    if (['clients', 'testimonials', 'ratings'].includes(legacyResource)) return method === 'GET'
    if (legacyResource === 'blog-writing-requests') {
      return permissions.includes('blog-writing-requests') && ['GET', 'PATCH'].includes(method)
    }
    if (legacyResource === 'blog-authors') {
      if (method === 'POST') return permissions.includes('blog-writing-requests')
      return permissions.includes('blog-writers') && ['GET', 'PATCH'].includes(method)
    }
    if (legacyResource === 'blog-posts') {
      return permissions.includes('blog-post-review') && ['GET', 'PATCH'].includes(method)
    }
    return false
  }

  const allowed = (permission: string, readOnly = false) =>
    permissions.includes(permission) &&
    (method === 'GET' || (!readOnly && ['POST', 'PATCH', 'DELETE'].includes(method)))

  if (path === '/dashboard' && method === 'GET') return true

  if (['/uploads/signature', '/uploads/verify'].includes(path)) {
    if (method !== 'POST') return false
    const mediaPermissions =
      resourceType === 'video'
        ? ['projects', 'site-settings']
        : resourceType === 'image'
          ? ['projects', 'clients', 'testimonials']
          : []
    return mediaPermissions.some((permission) => allowed(permission))
  }

  const [resource] = path.replace(/^\/+/, '').split('/')
  if (resource === 'blog-writing-requests') return allowed('blog-writing-requests')
  if (resource === 'blog-authors') {
    if (method === 'POST') return allowed('blog-writing-requests')
    return allowed('blog-writers')
  }
  if (resource === 'blog-posts') return allowed('blog-post-review')
  if (
    ['projects', 'clients', 'testimonials', 'services', 'site-settings', 'ratings'].includes(
      resource,
    )
  )
    return allowed(resource)
  if (resource === 'inquiries') return allowed('inquiries')

  return false
}
