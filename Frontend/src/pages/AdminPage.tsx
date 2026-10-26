import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  LogOut,
  Plus,
  Save,
  Star,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, type PageResult } from '../lib/api'
import { sendStudioInquiryNotification } from '../lib/emailjs'

type ResourceName =
  'projects' | 'clients' | 'testimonials' | 'services' | 'site-settings' | 'ratings'
type AdminPermission = ResourceName | 'inquiries'
type AdminRole = 'owner' | 'full' | 'limited' | 'custom'
type AdminRecord = CmsRecord & {
  email: string
  role: AdminRole
  permissions: AdminPermission[]
  createdAt: string
}
type InquiryStatusUpdate = { record: CmsRecord; status: string; comment: string }
type CmsRecord = Record<string, unknown> & { _id: string }
type Field = {
  name: string
  label: string
  type?:
    | 'text'
    | 'email'
    | 'tel'
    | 'url'
    | 'date'
    | 'textarea'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'media'
  options?: string[]
  mediaResource?: 'image' | 'video'
  helpText?: string
  hidden?: boolean
  required?: boolean
  min?: number
  max?: number
}
type UploadSignature = {
  timestamp: number
  folder: string
  upload_preset: string
  signature: string
  apiKey: string
  cloudName: string
  maxFileSizeBytes: number
  allowedFormats: string[]
}
type CloudinaryResult = { public_id?: string; error?: { message?: string } }
type VerifiedMedia = { secureUrl: string; publicId: string }

const resourceConfig: Record<ResourceName, { label: string; fields: Field[] }> = {
  projects: {
    label: 'Projects',
    fields: [
      { name: 'title', label: 'Project title' },
      { name: 'slug', label: 'URL slug' },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: [
          'Short-form',
          'YouTube',
          'Podcast',
          'Commercial',
          'Motion graphics',
          'Brand & promo',
        ],
      },
      { name: 'clientName', label: 'Client name' },
      { name: 'description', label: 'Project description', type: 'textarea' },
      { name: 'thumbnailUrl', label: 'Thumbnail image', type: 'media', mediaResource: 'image' },
      { name: 'thumbnailPublicId', label: 'Thumbnail storage ID', hidden: true },
      { name: 'videoUrl', label: 'Video file', type: 'media', mediaResource: 'video' },
      { name: 'videoPublicId', label: 'Video storage ID', hidden: true },
      { name: 'brief', label: 'Project brief', type: 'textarea' },
      { name: 'approach', label: 'Editing approach', type: 'textarea' },
      { name: 'deliverables', label: 'Deliverables (comma-separated)' },
      {
        name: 'status',
        label: 'Publication status',
        type: 'select',
        options: ['draft', 'published', 'archived'],
      },
    ],
  },
  clients: {
    label: 'Clients',
    fields: [
      { name: 'name', label: 'Client or project name' },
      { name: 'videoUrl', label: 'Client video', type: 'media', mediaResource: 'video' },
      { name: 'videoPublicId', label: 'Video storage ID', hidden: true },
      {
        name: 'videoThumbnailUrl',
        label: 'Video thumbnail',
        type: 'media',
        mediaResource: 'image',
      },
      { name: 'videoThumbnailPublicId', label: 'Thumbnail storage ID', hidden: true },
      {
        name: 'commentScreenshotUrl',
        label: 'Screenshot of client feedback',
        type: 'media',
        mediaResource: 'image',
      },
      { name: 'commentScreenshotPublicId', label: 'Screenshot storage ID', hidden: true },
      { name: 'socialPlatform', label: 'Social platform (e.g. Instagram)' },
      { name: 'socialHandle', label: 'Client social handle or ID' },
      { name: 'isPublished', label: 'Publish profile', type: 'checkbox' },
    ],
  },
  testimonials: {
    label: 'Testimonials',
    fields: [
      { name: 'clientName', label: 'Client name' },
      { name: 'role', label: 'Role or creator category' },
      { name: 'company', label: 'Company or channel' },
      { name: 'quote', label: 'Approved quote', type: 'textarea' },
      {
        name: 'profileImageUrl',
        label: 'Approved profile image',
        type: 'media',
        mediaResource: 'image',
      },
      { name: 'profileImagePublicId', label: 'Profile image storage ID', hidden: true },
      { name: 'sourceUrl', label: 'Public source URL', type: 'url' },
      { name: 'rating', label: 'Rating (only if supplied)', type: 'number' },
      {
        name: 'status',
        label: 'Approval status',
        type: 'select',
        options: ['draft', 'approved', 'archived'],
      },
    ],
  },
  services: {
    label: 'Services',
    fields: [
      { name: 'title', label: 'Service name' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'deliverables', label: 'Deliverables (comma-separated)' },
      { name: 'sortOrder', label: 'Display order', type: 'number' },
      { name: 'isActive', label: 'Show on public site', type: 'checkbox' },
    ],
  },
  'site-settings': {
    label: 'Site settings',
    fields: [
      { name: 'studioEmail', label: 'Studio contact email', type: 'email' },
      { name: 'contactNumber', label: 'Contact number', type: 'tel' },
      { name: 'discordId', label: 'Discord ID' },
      { name: 'instagramUrl', label: 'Instagram URL', type: 'url' },
      { name: 'youtubeUrl', label: 'YouTube URL', type: 'url' },
      { name: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
      {
        name: 'showreelUrl',
        label: 'Homepage showreel',
        type: 'media',
        mediaResource: 'video',
        helpText:
          'Use an MP4 (H.264 recommended) or WebM video. Images and YouTube/Instagram page links cannot play here; upload a video file or paste a direct video-file URL.',
      },
      { name: 'showreelPublicId', label: 'Showreel storage ID', hidden: true },
      {
        name: 'homeHeadline',
        label: 'Homepage headline (use a new line for line break)',
        type: 'textarea',
      },
      { name: 'homeDescription', label: 'Homepage description', type: 'textarea' },
    ],
  },
  ratings: {
    label: 'Client ratings',
    fields: [
      { name: 'rating', label: 'Star rating', type: 'number', min: 1, max: 5, required: true },
      { name: 'name', label: 'Client name', required: true },
      { name: 'socialPlatform', label: 'Social platform', required: true },
      { name: 'socialHandle', label: 'Platform username or ID', required: true },
    ],
  },
}

const inquiryFields: Field[] = [
  { name: 'name', label: 'Client name', type: 'text', required: true },
  { name: 'email', label: 'Email address', type: 'email', required: true },
  { name: 'company', label: 'Company or creator name' },
  { name: 'websiteOrSocial', label: 'Website or social profile' },
  { name: 'service', label: 'Service', required: true },
  { name: 'projectDescription', label: 'Project description', type: 'textarea', required: true },
  {
    name: 'budget',
    label: 'Approximate budget',
    type: 'select',
    options: ['', 'Under $500', '$500–$1,500', '$1,500–$5,000', '$5,000+', 'Not sure yet'],
  },
  { name: 'deadline', label: 'Target deadline', type: 'date' },
  { name: 'deliverables', label: 'Video length or deliverables' },
  { name: 'referenceLinks', label: 'Reference links', type: 'textarea' },
  {
    name: 'status',
    label: 'Inquiry status',
    type: 'select',
    options: ['new', 'in_progress', 'closed'],
    required: true,
  },
]

const resources = Object.keys(resourceConfig) as ResourceName[]
const permissionOptions: { key: AdminPermission; label: string }[] = [
  { key: 'projects', label: 'Projects' },
  { key: 'clients', label: 'Clients' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'services', label: 'Services' },
  { key: 'site-settings', label: 'Site settings' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'ratings', label: 'Client ratings' },
  { key: 'ratings', label: 'Client ratings' },
]
const statusOptions = ['new', 'in_progress', 'closed']

function recordLabel(record: CmsRecord, resource: ResourceName) {
  const preferred =
    resource === 'clients'
      ? record.name
      : resource === 'testimonials'
        ? record.clientName
        : resource === 'ratings'
          ? record.name
          : record.title
  return typeof preferred === 'string' && preferred
    ? preferred
    : resourceConfig[resource].label.replace(/s$/, '')
}

export function AdminPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginRoute = location.pathname.endsWith('/login')
  const [authState, setAuthState] = useState<'checking' | 'signed-in' | 'signed-out'>(() =>
    location.pathname.endsWith('/login') ? 'signed-out' : 'checking',
  )
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('owner')
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (isLoginRoute) return
    apiRequest<{ email: string; role: AdminRole; permissions: AdminPermission[] }>(
      '/api/admin/auth/me',
    )
      .then((admin) => {
        setEmail(admin.email)
        setRole(admin.role)
        setPermissions(admin.permissions ?? [])
        setAuthState('signed-in')
        if (location.pathname.endsWith('/login')) navigate('/admin', { replace: true })
      })
      .catch(() => {
        setAuthState('signed-out')
        if (!location.pathname.endsWith('/login')) navigate('/admin/login', { replace: true })
      })
  }, [isLoginRoute, location.pathname, navigate])

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')
    try {
      const admin = await apiRequest<{
        email: string
        role: AdminRole
        permissions: AdminPermission[]
      }>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setEmail(admin.email)
      setRole(admin.role)
      setPermissions(admin.permissions ?? [])
      setPassword('')
      setAuthState('signed-in')
      navigate('/admin', { replace: true })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }

  if (authState === 'checking')
    return (
      <div className="admin-loading">
        <span className="eyebrow">VERIFYING ADMIN SESSION</span>
      </div>
    )
  if (authState === 'signed-out' || isLoginRoute) {
    return (
      <main className="admin-login">
        <Link className="wordmark" to="/">
          <span className="wordmark-mark">AZ</span>
          <span>
            A Z <span className="wordmark-light">STUDIOS</span>
          </span>
        </Link>
        <form className="admin-login-card" onSubmit={signIn}>
          <span className="eyebrow">OWNER ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your studio website.</p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authError && (
            <p className="form-error" role="alert">
              {authError}
            </p>
          )}
          <button className="button button-accent" type="submit">
            Sign in <ArrowRight size={15} />
          </button>
          <Link className="back-link" to="/">
            <ArrowLeft size={14} /> Return to website
          </Link>
        </form>
      </main>
    )
  }

  return (
    <AdminDashboard
      email={email}
      role={role}
      permissions={permissions}
      signOutError={authError}
      onSignOut={async () => {
        try {
          await apiRequest('/api/admin/auth/logout', { method: 'POST' })
          setAuthState('signed-out')
          navigate('/admin/login', { replace: true })
        } catch (error) {
          setAuthError(error instanceof Error ? error.message : 'Unable to sign out.')
        }
      }}
    />
  )
}

function AdminDashboard({
  email,
  role,
  permissions,
  signOutError,
  onSignOut,
}: {
  email: string
  role: AdminRole
  permissions: AdminPermission[]
  signOutError: string
  onSignOut: () => void
}) {
  const [activeTab, setActiveTab] = useState<ResourceName | 'inquiries' | 'admins'>(() => {
    if (role === 'owner' || role === 'full' || role === 'limited') return 'projects'
    return (
      resources.find((resource) => permissions.includes(resource)) ??
      (permissions.includes('inquiries') ? 'inquiries' : 'projects')
    )
  })
  const [records, setRecords] = useState<CmsRecord[]>([])
  const [inquiries, setInquiries] = useState<CmsRecord[]>([])
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [counts, setCounts] = useState({
    projects: 0,
    inquiries: 0,
    publishedProjects: 0,
    newInquiries: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [contentPage, setContentPage] = useState(1)
  const [contentPages, setContentPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<CmsRecord | null>(null)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    permissions: ['projects', 'services'] as AdminPermission[],
  })
  const [pendingInquiryUpdate, setPendingInquiryUpdate] = useState<InquiryStatusUpdate | null>(null)
  const [sendingInquiryNotification, setSendingInquiryNotification] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const dashboard = await apiRequest<Partial<typeof counts>>('/api/admin/dashboard')
      setCounts({
        projects: dashboard.projects ?? 0,
        publishedProjects: dashboard.publishedProjects ?? 0,
        inquiries: dashboard.inquiries ?? 0,
        newInquiries: dashboard.newInquiries ?? 0,
      })
      const query = new URLSearchParams({ page: String(contentPage), limit: '20' })
      if (statusFilter) query.set('status', statusFilter)
      if (activeTab === 'admins') {
        setAdmins(await apiRequest<AdminRecord[]>('/api/admin/admins'))
        setContentPages(1)
      } else if (activeTab === 'inquiries') {
        const result = await apiRequest<PageResult<CmsRecord>>(`/api/admin/inquiries?${query}`)
        setInquiries(result.items)
        setContentPages(result.pages)
      } else {
        const result = await apiRequest<PageResult<CmsRecord>>(`/api/admin/${activeTab}?${query}`)
        setRecords(result.items)
        setContentPages(result.pages)
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to load dashboard data.',
      )
    } finally {
      setLoading(false)
    }
  }, [activeTab, contentPage, statusFilter])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  const filteredRecords = useMemo(() => {
    const source = activeTab === 'inquiries' ? inquiries : activeTab === 'admins' ? admins : records
    return source.filter((record) =>
      JSON.stringify(record).toLowerCase().includes(search.toLowerCase()),
    )
  }, [activeTab, admins, inquiries, records, search])
  const activeRecords = filteredRecords

  function selectTab(tab: ResourceName | 'inquiries' | 'admins') {
    setActiveTab(tab)
    setEditing(null)
    setSearch('')
    setStatusFilter('')
    setContentPage(1)
    setLoading(true)
    setError('')
  }

  function selectPage(page: number) {
    setContentPage(page)
    setLoading(true)
    setError('')
  }

  function selectStatus(status: string) {
    setStatusFilter(status)
    setContentPage(1)
    setLoading(true)
    setError('')
  }

  async function uploadMedia(field: Field, file?: File) {
    if (!file || !field.mediaResource) return
    const allowedTypes =
      field.mediaResource === 'image'
        ? ['image/jpeg', 'image/png', 'image/webp']
        : ['video/mp4', 'video/webm', 'video/quicktime']
    if (!allowedTypes.includes(file.type)) {
      setError(
        `Choose a supported ${field.mediaResource} format: ${field.mediaResource === 'image' ? 'JPEG, PNG, or WebP' : 'MP4, WebM, or MOV'}.`,
      )
      return
    }
    setError('')
    setNotice('')
    setUploadingField(field.name)
    try {
      const signature = await apiRequest<UploadSignature>('/api/admin/uploads/signature', {
        method: 'POST',
        body: JSON.stringify({ resourceType: field.mediaResource }),
      })
      if (file.size > signature.maxFileSizeBytes) {
        throw new Error(
          `${field.mediaResource === 'image' ? 'Images' : 'Videos'} must be smaller than ${Math.floor(signature.maxFileSizeBytes / (1024 * 1024))} MB.`,
        )
      }
      const body = new FormData()
      body.append('file', file)
      body.append('api_key', signature.apiKey)
      body.append('timestamp', String(signature.timestamp))
      body.append('signature', signature.signature)
      body.append('folder', signature.folder)
      body.append('upload_preset', signature.upload_preset)
      const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${field.mediaResource}/upload`,
        { method: 'POST', body },
      )
      const result = (await upload.json()) as CloudinaryResult
      if (!upload.ok || typeof result.public_id !== 'string') {
        throw new Error(result.error?.message ?? 'Cloudinary could not accept this upload.')
      }
      const verified = await apiRequest<VerifiedMedia>('/api/admin/uploads/verify', {
        method: 'POST',
        body: JSON.stringify({ resourceType: field.mediaResource, publicId: result.public_id }),
      })
      const idField = field.name.replace('Url', 'PublicId')
      setForm((current) => ({
        ...current,
        [field.name]: verified.secureUrl,
        [idField]: verified.publicId,
      }))
      setNotice('Upload complete. Save the record to publish the new media.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Media upload failed.')
    } finally {
      setUploadingField(null)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(
      Object.fromEntries(
        (activeTab === 'inquiries'
          ? inquiryFields
          : resourceConfig[activeTab as ResourceName].fields
        ).map((field) => [
          field.name,
          field.name === 'isActive'
            ? true
            : field.type === 'checkbox'
              ? false
              : field.type === 'select'
                ? (field.options?.[0] ?? '')
                : '',
        ]),
      ),
    )
    setError('')
    setNotice('')
  }

  function openEdit(record: CmsRecord) {
    setEditing(record)
    setForm(
      Object.fromEntries(
        (activeTab === 'inquiries'
          ? inquiryFields
          : resourceConfig[activeTab as ResourceName].fields
        ).map((field) => {
          const value = record[field.name]
          if (field.name === 'deliverables' && Array.isArray(value))
            return [field.name, value.join(', ')]
          return [
            field.name,
            field.type === 'checkbox' ? Boolean(value) : value == null ? '' : String(value),
          ]
        }),
      ),
    )
    setError('')
    setNotice('')
  }

  async function saveContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeTab === 'admins') return
    const payload: Record<string, unknown> = { ...form }
    const fields = activeTab === 'inquiries' ? inquiryFields : resourceConfig[activeTab].fields
    for (const field of fields) {
      const value = payload[field.name]
      if (field.type === 'number' && value !== '') payload[field.name] = Number(value)
      if (field.name === 'deliverables' && typeof value === 'string')
        payload[field.name] = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      if (payload[field.name] === '') delete payload[field.name]
    }
    setError('')
    setNotice('')
    try {
      await apiRequest(
        editing ? `/api/admin/${activeTab}/${editing._id}` : `/api/admin/${activeTab}`,
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      setEditing(null)
      setLoading(true)
      setNotice('Changes saved.')
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save this item.')
    }
  }

  async function deleteRecord(record: CmsRecord) {
    const label =
      activeTab === 'inquiries'
        ? String(record.name ?? 'inquiry')
        : recordLabel(record, activeTab as ResourceName)
    if (!window.confirm(`Permanently delete “${label}”?`)) return
    setError('')
    try {
      await apiRequest(`/api/admin/${activeTab}/${record._id}`, { method: 'DELETE' })
      setLoading(true)
      setNotice('Item deleted.')
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete this item.')
    }
  }

  async function updateInquiry(record: CmsRecord, status: string, comment: string) {
    setError('')
    try {
      await apiRequest(`/api/admin/inquiries/${record._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment }),
      })
      setPendingInquiryUpdate(null)
      setLoading(true)
      setNotice('Inquiry status updated.')
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update inquiry.')
    }
  }

  async function notifyInquiry(record: CmsRecord) {
    setError('')
    setNotice('')
    setSendingInquiryNotification(record._id)
    try {
      await sendStudioInquiryNotification({
        inquiryNumber: typeof record.inquiryNumber === 'string' ? record.inquiryNumber : undefined,
        name: String(record.name ?? ''),
        email: String(record.email ?? ''),
        company: typeof record.company === 'string' ? record.company : undefined,
        service: String(record.service ?? ''),
        projectDescription: String(record.projectDescription ?? ''),
        budget: typeof record.budget === 'string' ? record.budget : undefined,
        deadline: typeof record.deadline === 'string' ? record.deadline : undefined,
        deliverables: typeof record.deliverables === 'string' ? record.deliverables : undefined,
        referenceLinks:
          typeof record.referenceLinks === 'string' ? record.referenceLinks : undefined,
      })
      setNotice('Studio email notification sent.')
    } catch (notificationError) {
      setError(
        notificationError instanceof Error
          ? notificationError.message
          : 'The studio email notification could not be sent.',
      )
    } finally {
      setSendingInquiryNotification(null)
    }
  }

  async function createAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await apiRequest('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(newAdmin),
      })
      setNewAdmin({ email: '', password: '', permissions: ['projects', 'services'] })
      setNotice('Admin account created. Share its login details securely.')
      setLoading(true)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create admin.')
    }
  }

  async function revokeAdmin(admin: AdminRecord) {
    if (!window.confirm(`Revoke admin access for ${admin.email}?`)) return
    setError('')
    try {
      await apiRequest(`/api/admin/admins/${admin._id}`, { method: 'DELETE' })
      setNotice('Admin access revoked.')
      setLoading(true)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not revoke access.')
    }
  }

  const hasPermission = (permission: AdminPermission) =>
    role === 'owner' ||
    role === 'full' ||
    (role === 'limited' &&
      (['projects', 'services', 'clients', 'testimonials', 'ratings'] as string[]).includes(
        permission,
      )) ||
    permissions.includes(permission)
  const visibleResources = resources.filter((resource) => hasPermission(resource))
  const canManageInquiries = hasPermission('inquiries')
  const canEditActiveResource =
    role === 'owner' ||
    role === 'full' ||
    (role === 'limited' && ['projects', 'services'].includes(activeTab)) ||
    (activeTab === 'inquiries'
      ? permissions.includes('inquiries')
      : activeTab !== 'admins' && permissions.includes(activeTab))

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link className="wordmark" to="/">
          <span className="wordmark-mark">AZ</span>
          <span>
            A Z <span className="wordmark-light">STUDIOS</span>
          </span>
        </Link>
        <span className="eyebrow sidebar-label">
          {role === 'owner'
            ? 'OWNER ACCESS'
            : role === 'full'
              ? 'FULL ADMIN'
              : role === 'custom'
                ? 'CUSTOM ADMIN'
                : 'LIMITED ADMIN'}
        </span>
        <nav aria-label="Admin sections">
          {visibleResources.map((resource) => (
            <button
              key={resource}
              type="button"
              className={activeTab === resource ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => selectTab(resource)}
            >
              {resource === 'ratings' ? <Star size={16} /> : <BriefcaseBusiness size={16} />}
              {resourceConfig[resource].label}
            </button>
          ))}
          {canManageInquiries && (
            <button
              type="button"
              className={activeTab === 'inquiries' ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => selectTab('inquiries')}
            >
              <Users size={16} />
              Inquiries <span className="admin-badge">{counts.newInquiries}</span>
            </button>
          )}
          {role === 'owner' && (
            <button
              type="button"
              className={activeTab === 'admins' ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => selectTab('admins')}
            >
              <Users size={16} />
              Admin accounts
            </button>
          )}
        </nav>
        <div className="admin-sidebar-bottom">
          <span>{email}</span>
          <button type="button" onClick={onSignOut}>
            <LogOut size={15} /> Sign out
          </button>
          <Link to="/">
            <ArrowLeft size={14} /> Public website
          </Link>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <span className="eyebrow">A Z STUDIOS / {role.toUpperCase()} DASHBOARD</span>
          <span className="admin-user">{email}</span>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">STUDIO MANAGEMENT</span>
              <h1>
                {activeTab === 'admins'
                  ? 'Admin accounts'
                  : activeTab === 'inquiries'
                    ? 'Project inquiries'
                    : activeTab === 'site-settings'
                      ? 'Site settings'
                      : resourceConfig[activeTab].label}
              </h1>
              <p>Manage the content that appears on your public website.</p>
            </div>
            {activeTab !== 'admins' && canEditActiveResource && (
              <button className="button button-accent" type="button" onClick={openCreate}>
                <Plus size={16} /> Add{' '}
                {activeTab === 'inquiries'
                  ? 'inquiry'
                  : resourceConfig[activeTab].label.replace(/s$/, '')}
              </button>
            )}
          </div>
          <div className={`admin-stats${!canManageInquiries ? ' limited-admin-stats' : ''}`}>
            <div>
              <span>Active projects</span>
              <strong>{counts.projects}</strong>
            </div>
            <div>
              <span>Published projects</span>
              <strong>{counts.publishedProjects}</strong>
            </div>
            {canManageInquiries && (
              <>
                <div>
                  <span>Total inquiries</span>
                  <strong>{counts.inquiries}</strong>
                </div>
                <div>
                  <span>New inquiries</span>
                  <strong>{counts.newInquiries}</strong>
                </div>
              </>
            )}
          </div>

          {(error || signOutError) && (
            <p className="admin-alert" role="alert">
              {error || signOutError}
            </p>
          )}
          {notice && (
            <p className="admin-notice" role="status">
              {notice}
            </p>
          )}

          {activeTab === 'admins' ? (
            <section className="admin-editor">
              <div className="admin-editor-heading">
                <div>
                  <span className="eyebrow">OWNER ONLY</span>
                  <h2>Create an admin account</h2>
                  <p>Select each section this admin may view and edit.</p>
                  <p>
                    Admin account management remains owner-only. Unchecked sections are blocked.
                  </p>
                </div>
              </div>
              <form onSubmit={createAdmin}>
                <div className="admin-form-grid">
                  <label className="field">
                    <span>Email address</span>
                    <input
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="off"
                      value={newAdmin.email}
                      onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Temporary password (minimum 12 characters)</span>
                    <input
                      type="password"
                      required
                      minLength={12}
                      maxLength={72}
                      autoComplete="new-password"
                      value={newAdmin.password}
                      onChange={(event) =>
                        setNewAdmin({ ...newAdmin, password: event.target.value })
                      }
                    />
                  </label>
                  <fieldset className="admin-permission-fieldset field-full">
                    <legend className="eyebrow">SECTION PERMISSIONS</legend>
                    <div className="admin-permission-grid">
                      {permissionOptions.map((permission) => (
                        <label className="admin-permission-option" key={permission.key}>
                          <input
                            type="checkbox"
                            checked={newAdmin.permissions.includes(permission.key)}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...newAdmin.permissions, permission.key]
                                : newAdmin.permissions.filter((item) => item !== permission.key)
                              setNewAdmin({ ...newAdmin, permissions: next })
                            }}
                          />
                          <span>{permission.label}</span>
                          <small>View and edit</small>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="admin-editor-actions">
                  <button
                    className="button button-accent"
                    type="submit"
                    disabled={newAdmin.permissions.length === 0}
                  >
                    <Plus size={15} /> Create admin
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeTab !== 'admins' && (editing !== null || Object.keys(form).length > 0) ? (
            <form className="admin-editor" onSubmit={saveContent}>
              <div className="admin-editor-heading">
                <div>
                  <span className="eyebrow">{editing ? 'EDIT ITEM' : 'NEW ITEM'}</span>
                  <h2>
                    {editing
                      ? activeTab === 'inquiries'
                        ? 'Update inquiry'
                        : 'Update content'
                      : `Add ${
                          activeTab === 'inquiries'
                            ? 'inquiry'
                            : resourceConfig[activeTab as ResourceName].label
                                .toLowerCase()
                                .replace(/s$/, '')
                        }`}
                  </h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close editor"
                  onClick={() => {
                    setEditing(null)
                    setForm({})
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="admin-form-grid">
                {(activeTab === 'inquiries'
                  ? inquiryFields
                  : resourceConfig[activeTab as ResourceName].fields
                )
                  .filter((field) => !field.hidden)
                  .map((field) => (
                    <label
                      className={`field ${field.type === 'textarea' ? 'field-full' : ''}`}
                      key={field.name}
                    >
                      <span>{field.label}</span>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          required={field.required}
                          value={String(form[field.name] ?? '')}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.value })
                          }
                        />
                      ) : field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={String(form[field.name] ?? field.options?.[0] ?? '')}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.value })
                          }
                        >
                          {field.options?.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(form[field.name])}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.checked })
                          }
                        />
                      ) : field.type === 'media' ? (
                        <>
                          <input
                            type="url"
                            placeholder="Paste a media URL or upload a file"
                            value={String(form[field.name] ?? '')}
                            onChange={(event) => {
                              const idField = field.name.replace('Url', 'PublicId')
                              setForm({ ...form, [field.name]: event.target.value, [idField]: '' })
                            }}
                          />
                          <input
                            type="file"
                            accept={
                              field.mediaResource === 'image'
                                ? 'image/jpeg,image/png,image/webp'
                                : 'video/mp4,video/webm,video/quicktime'
                            }
                            disabled={uploadingField === field.name}
                            onChange={(event) => void uploadMedia(field, event.target.files?.[0])}
                            aria-label={`Upload ${field.label}`}
                          />
                          {uploadingField === field.name && <small>Uploading securely…</small>}
                        </>
                      ) : (
                        <input
                          type={field.type ?? 'text'}
                          required={field.required}
                          min={field.min}
                          max={field.max}
                          value={String(form[field.name] ?? '')}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.value })
                          }
                        />
                      )}
                      {field.helpText && <small>{field.helpText}</small>}
                    </label>
                  ))}
              </div>
              <div className="admin-editor-actions">
                <button
                  type="submit"
                  className="button button-accent"
                  disabled={uploadingField !== null}
                >
                  <Save size={15} /> Save changes
                </button>
                <button
                  className="admin-cancel"
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setForm({})
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <div className="admin-list-tools">
            <input
              type="search"
              placeholder={`Search ${
                activeTab === 'admins'
                  ? 'admin accounts'
                  : activeTab === 'inquiries'
                    ? 'inquiries'
                    : resourceConfig[activeTab].label.toLowerCase()
              }…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search content"
            />
            {activeTab !== 'admins' &&
              (activeTab === 'projects' ||
                activeTab === 'testimonials' ||
                activeTab === 'inquiries') && (
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => selectStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {(activeTab === 'projects'
                    ? ['draft', 'published', 'archived']
                    : activeTab === 'testimonials'
                      ? ['draft', 'approved', 'archived']
                      : statusOptions
                  ).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              )}
          </div>
          <div className="admin-table-wrap">
            {loading ? (
              <p className="admin-empty">Loading content…</p>
            ) : activeRecords.length === 0 ? (
              <p className="admin-empty">
                {activeTab === 'inquiries'
                  ? 'No inquiries yet.'
                  : 'No content found. Use the button above to add the first item.'}
              </p>
            ) : activeTab === 'admins' ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Permissions</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((record) => {
                    const admin = record as AdminRecord
                    return (
                      <tr key={admin._id}>
                        <td>
                          <strong>{admin.email}</strong>
                        </td>
                        <td>
                          {admin.role === 'owner' ? (
                            <span className="status-pill">Owner — all access</span>
                          ) : (
                            <div className="admin-permission-summary">
                              {(admin.permissions ?? [])
                                .map(
                                  (permission) =>
                                    permissionOptions.find((option) => option.key === permission)
                                      ?.label ?? permission,
                                )
                                .join(', ') || admin.role}
                            </div>
                          )}
                        </td>
                        <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                        <td>
                          {admin.role !== 'owner' && admin.email !== email ? (
                            <button
                              type="button"
                              className="danger-action"
                              onClick={() => void revokeAdmin(admin)}
                            >
                              Revoke access
                            </button>
                          ) : (
                            <span>Protected</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : activeTab === 'inquiries' ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Inquiry</th>
                    <th>Service</th>
                    <th>Received</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{String(item.name)}</strong>
                        <small>Inquiry # {String(item.inquiryNumber ?? '—')}</small>
                        <small>
                          {String(item.email)}
                          {item.company ? ` · ${String(item.company)}` : ''}
                        </small>
                        <p>{String(item.projectDescription)}</p>
                      </td>
                      <td>{String(item.service)}</td>
                      <td>
                        {typeof item.createdAt === 'string'
                          ? new Date(item.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <select
                          value={String(item.status)}
                          onChange={(event) =>
                            setPendingInquiryUpdate({
                              record: item,
                              status: event.target.value,
                              comment: '',
                            })
                          }
                          aria-label={`Update status for ${String(item.name)}`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        <button
                          className="admin-notification-action"
                          type="button"
                          disabled={sendingInquiryNotification === item._id}
                          onClick={() => void notifyInquiry(item)}
                        >
                          {sendingInquiryNotification === item._id
                            ? 'Sending studio notification…'
                            : 'Send studio notification'}
                        </button>
                        {Array.isArray(item.statusHistory) && item.statusHistory.length > 0 && (
                          <details className="inquiry-history">
                            <summary>Status notes ({item.statusHistory.length})</summary>
                            {(item.statusHistory as Record<string, unknown>[]).map(
                              (entry, index) => (
                                <p key={`${String(entry.updatedAt)}-${index}`}>
                                  <strong>
                                    {String(entry.fromStatus)} → {String(entry.toStatus)}
                                  </strong>
                                  {entry.comment ? ` — ${String(entry.comment)}` : ''}
                                  <small>
                                    {' '}
                                    by {String(entry.updatedBy)} ·{' '}
                                    {typeof entry.updatedAt === 'string'
                                      ? new Date(entry.updatedAt).toLocaleString()
                                      : ''}
                                  </small>
                                </p>
                              ),
                            )}
                          </details>
                        )}
                        {pendingInquiryUpdate?.record._id === item._id && (
                          <form
                            className="inquiry-status-note"
                            onSubmit={(event) => {
                              event.preventDefault()
                              void updateInquiry(
                                item,
                                pendingInquiryUpdate.status,
                                pendingInquiryUpdate.comment,
                              )
                            }}
                          >
                            <label className="field">
                              <span>Internal note (optional)</span>
                              <textarea
                                rows={2}
                                maxLength={2000}
                                value={pendingInquiryUpdate.comment}
                                onChange={(event) =>
                                  setPendingInquiryUpdate({
                                    ...pendingInquiryUpdate,
                                    comment: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="admin-row-actions">
                              <button type="submit">Save status</button>
                              <button type="button" onClick={() => setPendingInquiryUpdate(null)}>
                                Cancel
                              </button>
                            </div>
                            <small>
                              Notes are visible to admins only; no customer email is sent.
                            </small>
                          </form>
                        )}
                      </td>
                      <td>
                        {canEditActiveResource ? (
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => openEdit(item)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-action"
                              onClick={() => void deleteRecord(item)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span>Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status / detail</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong>{recordLabel(record, activeTab as ResourceName)}</strong>
                        <small>
                          {activeTab === 'ratings'
                            ? `${String(record.socialPlatform ?? '')} · ${String(record.socialHandle ?? '')}`
                            : String(record.slug ?? record.category ?? record.email ?? '')}
                        </small>
                      </td>
                      <td>
                        {activeTab === 'ratings' ? (
                          <span className="status-pill">
                            {'★'.repeat(Number(record.rating) || 0)} · {String(record.rating)}/5
                          </span>
                        ) : (
                          <span className="status-pill">
                            {String(
                              record.status ??
                                (record.isPublished
                                  ? 'published'
                                  : record.isActive === false
                                    ? 'inactive'
                                    : 'active'),
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        {canEditActiveResource ? (
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => openEdit(record)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-action"
                              onClick={() => void deleteRecord(record)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span>Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!loading && contentPages > 1 && (
            <div className="pagination admin-pagination">
              <button
                type="button"
                disabled={contentPage <= 1}
                onClick={() => selectPage(contentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {contentPage} of {contentPages}
              </span>
              <button
                type="button"
                disabled={contentPage >= contentPages}
                onClick={() => selectPage(contentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
