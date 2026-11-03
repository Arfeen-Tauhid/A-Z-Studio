import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  History,
  LogOut,
  Plus,
  Save,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, ApiRequestError, type PageResult } from '../lib/api'
import { sendStudioInquiryNotification } from '../lib/emailjs'
import { isDirectVideoUrl } from '../lib/projectMedia'
import { youtubeVideoId } from '../lib/youtube'

type ResourceName =
  'projects' | 'clients' | 'testimonials' | 'services' | 'site-settings' | 'ratings'
type AdminPermission =
  | ResourceName
  | 'inquiries'
  | 'create-admins'
  | 'activity'
  | 'blog-writing-requests'
  | 'blog-writers'
  | 'blog-post-review'
type AdminRole = 'owner' | 'full' | 'limited' | 'custom'
type AdminRecord = CmsRecord & {
  adminNumber: string
  email: string
  role: AdminRole
  permissions: AdminPermission[]
  createdAt: string
  loginHeld?: boolean
}
type InquiryStatusUpdate = { record: CmsRecord; status: string; comment: string }
type AdminTab =
  | ResourceName
  | 'inquiries'
  | 'admins'
  | 'create-admin'
  | 'activity'
  | 'blog-requests'
  | 'blog-authors'
  | 'blog-posts'
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
type ResourceSample = {
  description: string
  values: Record<string, string | boolean>
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

const uploadedVideoHelpText =
  'Upload MP4, WebM, or MOV, or paste a link from YouTube or another social platform. Add a thumbnail for all links except YouTube.'

const resourceConfig: Record<
  ResourceName,
  { label: string; fields: Field[]; sample?: ResourceSample }
> = {
  projects: {
    label: 'Projects',
    sample: {
      description:
        'Project title: Studio launch film · Category: Brand & promo · Client: Northstar Coffee',
      values: {
        title: 'Studio launch film',
        category: 'Brand & promo',
        clientName: 'Northstar Coffee',
        description:
          'A warm launch film introducing Northstar Coffee and the people behind every cup.',
        videoAspectRatio: '16:9',
        videoUrl: '',
        status: 'draft',
      },
    },
    fields: [
      { name: 'title', label: 'Project title', required: true },
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
        required: true,
      },
      { name: 'clientName', label: 'Client name', required: true },
      {
        name: 'description',
        label: 'Project description',
        type: 'textarea',
        required: true,
      },
      {
        name: 'videoAspectRatio',
        label: 'Video aspect ratio',
        type: 'select',
        options: ['16:9', '9:16', '1:1', '4:5'],
        required: true,
        helpText:
          'Choose how the video is framed: landscape (16:9), vertical (9:16), square (1:1), or portrait (4:5).',
      },
      {
        name: 'thumbnailUrl',
        label: 'Thumbnail image',
        type: 'media',
        mediaResource: 'image',
        helpText:
          'YouTube thumbnails are automatic. For Instagram and other platform links, add a thumbnail image.',
      },
      {
        name: 'thumbnailPublicId',
        label: 'Thumbnail storage ID',
        hidden: true,
      },
      {
        name: 'videoUrl',
        label: 'Video link or file',
        type: 'media',
        mediaResource: 'video',
        helpText: `${uploadedVideoHelpText} For non-YouTube links and video files, paste a thumbnail URL or upload an image.`,
      },
      { name: 'videoPublicId', label: 'Video storage ID', hidden: true },
      {
        name: 'status',
        label: 'Publication status',
        type: 'select',
        options: ['draft', 'published'],
      },
    ],
  },
  clients: {
    label: 'Clients',
    sample: {
      description: 'Client name: Northstar Coffee · Video: an uploaded project highlight',
      values: {
        name: 'Northstar Coffee',
        videoUrl: '',
        isPublished: true,
      },
    },
    fields: [
      { name: 'name', label: 'Client or project name' },
      {
        name: 'videoUrl',
        label: 'Client video link or file',
        type: 'media',
        mediaResource: 'video',
        helpText: uploadedVideoHelpText,
      },
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
    sample: {
      description: 'Client: Alex Morgan · Country: USA · Channel: Northstar Coffee',
      values: {
        clientName: 'Alex Morgan',
        clientCountry: 'United States',
        clientChannelName: 'Northstar Coffee',
        quote:
          'The team understood our vision right away and turned it into a story we are proud to share.',
        rating: '5',
      },
    },
    fields: [
      { name: 'clientName', label: 'Client name', required: true },
      { name: 'clientCountry', label: 'Client country', required: true },
      { name: 'clientChannelName', label: 'Client channel name', required: true },
      { name: 'quote', label: 'Approved quote', type: 'textarea', required: true },
      {
        name: 'commentScreenshotUrl',
        label: 'Screenshot of feedback comment',
        type: 'media',
        mediaResource: 'image',
        required: true,
      },
      { name: 'commentScreenshotPublicId', label: 'Feedback screenshot storage ID', hidden: true },
      { name: 'rating', label: 'Rating', type: 'number', min: 1, max: 5, required: true },
      {
        name: 'status',
        label: 'Publication status',
        type: 'select',
        options: ['draft', 'approved'],
      },
    ],
  },
  services: {
    label: 'Services',
    sample: {
      description: 'Service: Social video editing · Includes short-form edits and captions',
      values: {
        title: 'Social video editing',
        description:
          'Platform-ready edits that turn your footage into clear, engaging social stories.',
        deliverables: 'Short-form edits, Captions, Platform-ready exports',
        sortOrder: '1',
        isActive: true,
      },
    },
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
        name: 'whatsappUrl',
        label: 'WhatsApp URL',
        type: 'url',
        helpText: 'Use a link such as https://wa.me/15551234567.',
      },
      {
        name: 'showreelUrl',
        label: 'Homepage showreel link or file',
        type: 'media',
        mediaResource: 'video',
        helpText: uploadedVideoHelpText,
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
  { name: 'contactNumber', label: 'Contact number (include country code)', type: 'tel' },
  { name: 'service', label: 'Service', required: true },
  { name: 'projectDescription', label: 'Project description', type: 'textarea', required: true },
  { name: 'budget', label: 'Approximate budget', type: 'number', min: 0 },
  {
    name: 'budgetCurrency',
    label: 'Budget currency',
    type: 'select',
    options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'AED', 'PKR', 'BDT', 'SAR'],
  },
  { name: 'deadline', label: 'Target deadline', type: 'date' },
  { name: 'referenceLinks', label: 'Reference link(s)', type: 'textarea' },
  {
    name: 'status',
    label: 'Inquiry status',
    type: 'select',
    options: ['new', 'in_progress', 'closed'],
    required: true,
  },
]

const resources = Object.keys(resourceConfig) as ResourceName[]
const permissionOptions: { key: AdminPermission; label: string; description?: string }[] = [
  { key: 'projects', label: 'Projects' },
  { key: 'clients', label: 'Clients' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'services', label: 'Services' },
  { key: 'site-settings', label: 'Site settings' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'ratings', label: 'Client ratings' },
  {
    key: 'create-admins',
    label: 'Create admin accounts',
    description: 'Create admins with permissions you hold',
  },
  { key: 'activity', label: 'View activity logs', description: 'Read recent admin activity' },
  {
    key: 'blog-writing-requests',
    label: 'Blog writing requests',
    description: 'Review applications and issue BLOG IDs with initial passwords',
  },
  {
    key: 'blog-writers',
    label: 'Blog writers',
    description: 'View writer accounts and hold or restore their logins',
  },
  {
    key: 'blog-post-review',
    label: 'Blog post review',
    description: 'Review submissions and publish or decline blog posts',
  },
]
const defaultAdminPermissions = permissionOptions.map((permission) => permission.key)
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
  const [adminNumber, setAdminNumber] = useState('')
  const [role, setRole] = useState<AdminRole>('owner')
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (isLoginRoute) return
    apiRequest<{
      email: string
      adminNumber: string
      role: AdminRole
      permissions: AdminPermission[]
    }>('/api/admin/auth/me')
      .then((admin) => {
        setEmail(admin.email)
        setAdminNumber(admin.adminNumber)
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
        adminNumber: string
        role: AdminRole
        permissions: AdminPermission[]
      }>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: loginIdentifier, password }),
      })
      setEmail(admin.email)
      setAdminNumber(admin.adminNumber)
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
          <span className="eyebrow">ADMIN ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your studio website.</p>
          <label className="field">
            <span>Email or Employee ID</span>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="name@example.com or AZ1234"
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
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
      adminNumber={adminNumber}
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
  adminNumber,
  role,
  permissions,
  signOutError,
  onSignOut,
}: {
  email: string
  adminNumber: string
  role: AdminRole
  permissions: AdminPermission[]
  signOutError: string
  onSignOut: () => void
}) {
  const assignableAdminPermissions = role === 'owner' ? defaultAdminPermissions : permissions
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (role === 'owner' || role === 'full' || role === 'limited') return 'projects'
    return (
      resources.find((resource) => permissions.includes(resource)) ??
      (permissions.includes('inquiries')
        ? 'inquiries'
        : permissions.includes('create-admins')
          ? 'create-admin'
          : permissions.includes('activity')
            ? 'activity'
            : permissions.includes('blog-writing-requests')
              ? 'blog-requests'
              : permissions.includes('blog-writers')
                ? 'blog-authors'
                : permissions.includes('blog-post-review')
                  ? 'blog-posts'
                  : 'projects')
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
  const sectionCache = useRef(new Map<string, { items: CmsRecord[]; pages: number }>())
  const requestId = useRef(0)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [contentPage, setContentPage] = useState(1)
  const [contentPages, setContentPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<CmsRecord | null>(null)
  const [editingBlogPost, setEditingBlogPost] = useState<CmsRecord | null>(null)
  const [blogPostDraft, setBlogPostDraft] = useState({
    title: '',
    category: '',
    excerpt: '',
    content: '',
  })
  const [blogPostStatusDraft, setBlogPostStatusDraft] = useState<Record<string, string>>({})
  const [editingAdminPermissions, setEditingAdminPermissions] = useState<AdminRecord | null>(null)
  const [adminPermissionDraft, setAdminPermissionDraft] = useState<AdminPermission[]>([])
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    permissions: [...assignableAdminPermissions],
  })
  const [writerPasswords, setWriterPasswords] = useState<Record<string, string>>({})
  const [issuedWriterCredentials, setIssuedWriterCredentials] = useState<{
    employeeId: string
    email: string
    password: string
  } | null>(null)
  const [pendingInquiryUpdate, setPendingInquiryUpdate] = useState<InquiryStatusUpdate | null>(null)
  const [sendingInquiryNotification, setSendingInquiryNotification] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestId.current
    const cacheKey = `${activeTab}:${contentPage}:${statusFilter}`
    try {
      const query = new URLSearchParams({ page: String(contentPage), limit: '20' })
      if (statusFilter) query.set('status', statusFilter)
      if (activeTab === 'admins') {
        const items = await apiRequest<AdminRecord[]>('/api/admin/admins')
        sectionCache.current.set(cacheKey, { items, pages: 1 })
        if (currentRequestId === requestId.current) {
          setAdmins(items)
          setContentPages(1)
        }
      } else if (activeTab === 'activity') {
        const items = await apiRequest<CmsRecord[]>('/api/admin/activity')
        sectionCache.current.set(cacheKey, { items, pages: 1 })
        if (currentRequestId === requestId.current) {
          setRecords(items)
          setContentPages(1)
        }
      } else if (activeTab === 'create-admin') {
        if (currentRequestId === requestId.current) {
          setRecords([])
          setContentPages(1)
        }
      } else if (
        activeTab === 'blog-requests' ||
        activeTab === 'blog-authors' ||
        activeTab === 'blog-posts'
      ) {
        const resource = activeTab === 'blog-requests' ? 'blog-writing-requests' : activeTab
        const queryString =
          activeTab === 'blog-posts' && statusFilter
            ? `?${new URLSearchParams({ status: statusFilter })}`
            : ''
        const items = await apiRequest<CmsRecord[]>(`/api/admin/${resource}${queryString}`)
        sectionCache.current.set(cacheKey, { items, pages: 1 })
        if (currentRequestId === requestId.current) {
          setRecords(items)
          setContentPages(1)
        }
      } else if (activeTab === 'inquiries') {
        const result = await apiRequest<PageResult<CmsRecord>>(`/api/admin/inquiries?${query}`)
        sectionCache.current.set(cacheKey, { items: result.items, pages: result.pages })
        if (currentRequestId === requestId.current) {
          setInquiries(result.items)
          setContentPages(result.pages)
        }
      } else {
        const result = await apiRequest<PageResult<CmsRecord>>(`/api/admin/${activeTab}?${query}`)
        sectionCache.current.set(cacheKey, { items: result.items, pages: result.pages })
        if (currentRequestId === requestId.current) {
          setRecords(result.items)
          setContentPages(result.pages)
        }
      }
    } catch (requestError) {
      if (currentRequestId === requestId.current)
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to load section data.',
        )
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [activeTab, contentPage, statusFilter])

  const refreshDashboard = useCallback(async () => {
    try {
      const dashboard = await apiRequest<Partial<typeof counts>>('/api/admin/dashboard')
      setCounts({
        projects: dashboard.projects ?? 0,
        publishedProjects: dashboard.publishedProjects ?? 0,
        inquiries: dashboard.inquiries ?? 0,
        newInquiries: dashboard.newInquiries ?? 0,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to load dashboard summary.',
      )
    }
  }, [])

  useEffect(() => {
    apiRequest<Partial<typeof counts>>('/api/admin/dashboard')
      .then((dashboard) => {
        setCounts({
          projects: dashboard.projects ?? 0,
          publishedProjects: dashboard.publishedProjects ?? 0,
          inquiries: dashboard.inquiries ?? 0,
          newInquiries: dashboard.newInquiries ?? 0,
        })
      })
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load dashboard summary.',
        )
      })
  }, [])

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

  function showCachedSection(tab: AdminTab, page: number, status: string) {
    const cached = sectionCache.current.get(`${tab}:${page}:${status}`)
    if (!cached) return false
    if (tab === 'admins') setAdmins(cached.items as AdminRecord[])
    else if (tab === 'inquiries') setInquiries(cached.items)
    else setRecords(cached.items)
    setContentPages(cached.pages)
    return true
  }

  function selectTab(tab: AdminTab) {
    setActiveTab(tab)
    setEditing(null)
    setForm({})
    setSearch('')
    setStatusFilter('')
    setContentPage(1)
    setLoading(!showCachedSection(tab, 1, ''))
    setError('')
    if (tab !== 'blog-requests') setIssuedWriterCredentials(null)
  }

  function selectPage(page: number) {
    setContentPage(page)
    setLoading(!showCachedSection(activeTab, page, statusFilter))
    setError('')
  }

  function selectStatus(status: string) {
    setStatusFilter(status)
    setContentPage(1)
    setLoading(!showCachedSection(activeTab, 1, status))
    setError('')
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function setRequestFieldErrors(requestError: unknown) {
    if (!(requestError instanceof ApiRequestError) || requestError.details.length === 0) {
      setFieldErrors({})
      return false
    }
    const errorsByField: Record<string, string> = {}
    for (const detail of requestError.details) {
      const field = detail.field.replace(/PublicId$/, 'Url')
      if (field && !(field in errorsByField)) errorsByField[field] = detail.message
    }
    setFieldErrors(errorsByField)
    return Object.keys(errorsByField).length > 0
  }

  async function uploadMedia(field: Field, file?: File) {
    if (!file || !field.mediaResource) return
    clearFieldError(field.name)
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

  function openCreate(sample?: ResourceSample) {
    setEditing(null)
    setFieldErrors({})
    setForm({
      ...Object.fromEntries(
        (activeTab === 'inquiries'
          ? inquiryFields
          : resourceConfig[activeTab as ResourceName].fields
        ).map((field) => [
          field.name,
          field.name === 'isActive'
            ? true
            : field.type === 'checkbox'
              ? false
              : field.name === 'videoAspectRatio'
                ? '9:16'
                : field.type === 'select'
                  ? (field.options?.[0] ?? '')
                  : '',
        ]),
      ),
      ...sample?.values,
    })
    setError('')
    setNotice('')
  }

  function openEdit(record: CmsRecord) {
    setEditing(record)
    setFieldErrors({})
    setForm({
      ...Object.fromEntries(
        (activeTab === 'inquiries'
          ? inquiryFields
          : resourceConfig[activeTab as ResourceName].fields
        ).map((field) => {
          const value = record[field.name]
          if (field.name === 'deliverables' && Array.isArray(value))
            return [field.name, value.join(', ')]
          if (field.name === 'videoAspectRatio' && value == null)
            return [field.name, record.category === 'Short-form' ? '9:16' : '16:9']
          return [
            field.name,
            field.type === 'checkbox' ? Boolean(value) : value == null ? '' : String(value),
          ]
        }),
      ),
      ...(activeTab === 'projects'
        ? {
            thumbnailPublicId:
              typeof record.thumbnailPublicId === 'string' ? record.thumbnailPublicId : '',
            videoPublicId: typeof record.videoPublicId === 'string' ? record.videoPublicId : '',
          }
        : {}),
    })
    setError('')
    setNotice('')
  }

  async function saveContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeTab === 'admins' || activeTab === 'create-admin' || activeTab === 'activity') return
    const payload: Record<string, unknown> = { ...form }
    if (activeTab === 'projects') {
      const youtubeVideo = youtubeVideoId(String(form.videoUrl ?? ''))
      const hasUploadedVideo = Boolean(form.videoUrl && form.videoPublicId)
      const hasSocialLink = Boolean(form.videoUrl && !isDirectVideoUrl(String(form.videoUrl)))
      const hasValidVideoSource = Boolean(youtubeVideo || hasUploadedVideo || hasSocialLink)
      const hasThumbnail = Boolean(form.thumbnailUrl)
      if (!hasValidVideoSource || (!youtubeVideo && !hasThumbnail)) {
        const missingMedia: Record<string, string> = {}
        if (!hasValidVideoSource)
          missingMedia.videoUrl = 'Paste a valid social media link or upload a video file.'
        if (!youtubeVideo && !hasThumbnail)
          missingMedia.thumbnailUrl = 'Paste a thumbnail image URL or upload an image.'
        setFieldErrors(missingMedia)
        setError('Please correct the highlighted fields.')
        return
      }
      if (activeTab === 'projects' && payload.status === 'published') {
        const action = editing ? 'save these changes to' : 'publish this project to'
        if (!window.confirm(`Are you sure you want to ${action} the public Work page?`)) return
      }
    }
    if (
      activeTab === 'testimonials' &&
      (!form.commentScreenshotUrl ||
        !form.rating ||
        Number(form.rating) < 1 ||
        Number(form.rating) > 5)
    ) {
      const testimonialErrors: Record<string, string> = {}
      if (!form.commentScreenshotUrl)
        testimonialErrors.commentScreenshotUrl = 'Upload a feedback screenshot.'
      if (!form.rating || Number(form.rating) < 1 || Number(form.rating) > 5)
        testimonialErrors.rating = 'Enter a rating from 1 to 5.'
      setFieldErrors(testimonialErrors)
      setError('Please correct the highlighted fields.')
      return
    }
    const fields =
      activeTab === 'inquiries' ? inquiryFields : resourceConfig[activeTab as ResourceName].fields
    for (const field of fields) {
      const value = payload[field.name]
      if (field.type === 'number' && value !== '' && field.name !== 'budget')
        payload[field.name] = Number(value)
      if (field.name === 'deliverables' && typeof value === 'string')
        payload[field.name] = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      if (payload[field.name] === '' && !(activeTab === 'projects' && field.name === 'videoUrl'))
        delete payload[field.name]
    }
    setError('')
    setNotice('')
    setFieldErrors({})
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
      await Promise.all([loadData(), refreshDashboard()])
    } catch (requestError) {
      const hasFieldErrors = setRequestFieldErrors(requestError)
      setError(requestError instanceof Error ? requestError.message : 'Could not save this item.')
      if (hasFieldErrors) setError('Please correct the highlighted fields.')
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
      await Promise.all([loadData(), refreshDashboard()])
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
      await Promise.all([loadData(), refreshDashboard()])
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
        contactNumber: typeof record.contactNumber === 'string' ? record.contactNumber : undefined,
        company: typeof record.company === 'string' ? record.company : undefined,
        service: String(record.service ?? ''),
        projectDescription: String(record.projectDescription ?? ''),
        budget: typeof record.budget === 'string' ? record.budget : undefined,
        budgetCurrency:
          typeof record.budgetCurrency === 'string' ? record.budgetCurrency : undefined,
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
    setFieldErrors({})
    try {
      const createdAdmin = await apiRequest<{ adminNumber: string }>('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(newAdmin),
      })
      setNewAdmin({
        email: '',
        password: '',
        permissions: [...assignableAdminPermissions],
      })
      setNotice(
        `Employee ${createdAdmin.adminNumber} created. They can sign in with this Employee ID or their email.`,
      )
      setLoading(true)
      await loadData()
    } catch (requestError) {
      const hasFieldErrors = setRequestFieldErrors(requestError)
      setError(
        hasFieldErrors
          ? 'Please correct the highlighted fields.'
          : requestError instanceof Error
            ? requestError.message
            : 'Could not create admin.',
      )
    }
  }

  async function saveAdminPermissions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingAdminPermissions || adminPermissionDraft.length === 0) return
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      await apiRequest(`/api/admin/admins/${editingAdminPermissions._id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: adminPermissionDraft }),
      })
      setEditingAdminPermissions(null)
      setAdminPermissionDraft([])
      setNotice('Admin permissions updated.')
      await loadData()
    } catch (requestError) {
      const hasFieldErrors = setRequestFieldErrors(requestError)
      setError(
        hasFieldErrors
          ? 'Please correct the highlighted fields.'
          : requestError instanceof Error
            ? requestError.message
            : 'Could not update permissions.',
      )
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

  async function setAdminLoginHold(admin: AdminRecord) {
    if (!admin.loginHeld && !window.confirm(`Put ${admin.email}'s login on hold?`)) return
    const loginHeld = !admin.loginHeld
    setError('')
    try {
      await apiRequest(`/api/admin/admins/${admin._id}/login-hold`, {
        method: 'PATCH',
        body: JSON.stringify({ loginHeld }),
      })
      setNotice(loginHeld ? `Login held for ${admin.email}.` : `Login restored for ${admin.email}.`)
      setLoading(true)
      await loadData()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not change admin login access.',
      )
    }
  }

  async function reviewBlogRequest(record: CmsRecord, status: 'approved' | 'declined') {
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/admin/blog-writing-requests/${record._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setLoading(true)
      setNotice(status === 'approved' ? 'Writing request approved.' : 'Writing request declined.')
      await loadData()
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not review the request.',
      )
    }
  }

  async function createBlogAuthor(record: CmsRecord) {
    const authorPassword = writerPasswords[record._id] ?? ''
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      const author = await apiRequest<{ employeeId: string }>('/api/admin/blog-authors', {
        method: 'POST',
        body: JSON.stringify({ requestId: record._id, password: authorPassword }),
      })
      setIssuedWriterCredentials({
        employeeId: author.employeeId,
        email: String(record.email),
        password: authorPassword,
      })
      setWriterPasswords((current) => ({ ...current, [record._id]: '' }))
      setLoading(true)
      setNotice('Blog writer account created. Share the one-time credentials below securely.')
      await loadData()
    } catch (requestError) {
      const hasFieldErrors = setRequestFieldErrors(requestError)
      setError(
        hasFieldErrors
          ? 'Please correct the highlighted fields.'
          : requestError instanceof Error
            ? requestError.message
            : 'Could not create the blog writer account.',
      )
    }
  }

  async function copyWriterCredentials() {
    if (!issuedWriterCredentials) return
    try {
      await navigator.clipboard.writeText(
        `BLOG Employee ID: ${issuedWriterCredentials.employeeId}\nEmail: ${issuedWriterCredentials.email}\nPassword: ${issuedWriterCredentials.password}`,
      )
      setNotice('Credentials copied. Share them with the writer using a secure channel.')
      setError('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? `Could not copy credentials: ${requestError.message}`
          : 'Could not copy credentials. Share the displayed values securely.',
      )
    }
  }

  async function setBlogAuthorLoginHold(record: CmsRecord) {
    const loginHeld = !record.loginHeld
    if (loginHeld && !window.confirm(`Put ${String(record.email)}'s blog writer login on hold?`))
      return
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/admin/blog-authors/${record._id}/login-hold`, {
        method: 'PATCH',
        body: JSON.stringify({ loginHeld }),
      })
      setLoading(true)
      setNotice(loginHeld ? 'Blog writer login placed on hold.' : 'Blog writer login restored.')
      await loadData()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not change blog writer login access.',
      )
    }
  }

  async function reviewBlogPost(record: CmsRecord, status: 'pending' | 'published' | 'declined') {
    setError('')
    setNotice('')
    try {
      const updatedPost = await apiRequest<CmsRecord>(
        `/api/admin/blog-posts/${record._id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      )
      for (const key of sectionCache.current.keys()) {
        if (key.startsWith('blog-posts:')) sectionCache.current.delete(key)
      }
      setRecords((current) => {
        const includesPost = current.some((item) => item._id === record._id)
        const matchesFilter = !statusFilter || updatedPost.status === statusFilter
        if (!matchesFilter) return current.filter((item) => item._id !== record._id)
        return includesPost
          ? current.map((item) => (item._id === record._id ? updatedPost : item))
          : [updatedPost, ...current]
      })
      setNotice(
        status === 'published'
          ? 'Article published.'
          : status === 'declined'
            ? 'Article declined.'
            : 'Article moved back to pending review.',
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not review the article.',
      )
    }
  }

  function editBlogPost(record: CmsRecord) {
    setEditingBlogPost(record)
    setBlogPostDraft({
      title: String(record.title ?? ''),
      category: String(record.category ?? ''),
      excerpt: String(record.excerpt ?? ''),
      content: String(record.content ?? ''),
    })
    setError('')
    setNotice('')
  }

  async function saveBlogPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingBlogPost) return
    setError('')
    setNotice('')
    try {
      const updatedPost = await apiRequest<CmsRecord>(
        `/api/admin/blog-posts/${editingBlogPost._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(blogPostDraft),
        },
      )
      setRecords((current) =>
        current.map((item) => (item._id === updatedPost._id ? updatedPost : item)),
      )
      for (const key of sectionCache.current.keys()) {
        if (key.startsWith('blog-posts:')) sectionCache.current.delete(key)
      }
      setEditingBlogPost(null)
      setNotice('Blog article updated.')
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not update the article.',
      )
    }
  }

  async function deleteBlogPost(record: CmsRecord) {
    const title = String(record.title ?? 'this article')
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/admin/blog-posts/${record._id}`, { method: 'DELETE' })
      if (editingBlogPost?._id === record._id) setEditingBlogPost(null)
      setRecords((current) => current.filter((item) => item._id !== record._id))
      for (const key of sectionCache.current.keys()) {
        if (key.startsWith('blog-posts:')) sectionCache.current.delete(key)
      }
      setNotice('Blog article deleted.')
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not delete the article.',
      )
    }
  }

  async function deleteActivity(item: CmsRecord) {
    if (!window.confirm('Delete this activity log entry? This cannot be undone.')) return
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/admin/activity/${item._id}`, { method: 'DELETE' })
      setRecords((current) => current.filter((entry) => entry._id !== item._id))
      sectionCache.current.delete('activity:1:')
      setNotice('Activity log entry deleted.')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not delete the activity log entry.',
      )
    }
  }

  async function deleteAllActivity() {
    if (
      !window.confirm(
        'Delete all activity log entries? This permanently removes the complete activity history and cannot be undone.',
      )
    ) {
      return
    }
    setError('')
    setNotice('')
    try {
      await apiRequest<{ deletedCount: number }>('/api/admin/activity', { method: 'DELETE' })
      setRecords([])
      sectionCache.current.delete('activity:1:')
      setNotice('All activity log entries have been deleted.')
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not clear the activity log.',
      )
    }
  }

  const canCreateAdmins = role === 'owner' || permissions.includes('create-admins')
  const canViewActivity = role === 'owner' || permissions.includes('activity')
  const canManageActivity =
    role === 'owner' &&
    email.toLowerCase() === 'arfeentauhid01@gmail.com' &&
    adminNumber === 'AZ1245'
  const canReviewBlogRequests = role === 'owner' || permissions.includes('blog-writing-requests')
  const canManageBlogWriters = role === 'owner' || permissions.includes('blog-writers')
  const canReviewBlogPosts = role === 'owner' || permissions.includes('blog-post-review')
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
    activeTab === 'inquiries'
      ? role === 'owner' || role === 'full' || permissions.includes('inquiries')
      : resources.includes(activeTab as ResourceName) &&
        (role === 'owner' ||
          role === 'full' ||
          (role === 'limited' && ['projects', 'services'].includes(activeTab)) ||
          permissions.includes(activeTab as ResourceName))

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
        <span className="admin-number">EMPLOYEE ID · {adminNumber}</span>
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
          {canCreateAdmins && role !== 'owner' && (
            <button
              type="button"
              className={activeTab === 'create-admin' ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => selectTab('create-admin')}
            >
              <Users size={16} />
              Create admin
            </button>
          )}
          {(role === 'owner' ||
            canReviewBlogRequests ||
            canManageBlogWriters ||
            canReviewBlogPosts) && (
            <>
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
              {canReviewBlogRequests && (
                <button
                  type="button"
                  className={
                    activeTab === 'blog-requests' ? 'admin-nav-item active' : 'admin-nav-item'
                  }
                  onClick={() => selectTab('blog-requests')}
                >
                  <Users size={16} />
                  Blog writing requests
                </button>
              )}
              {canManageBlogWriters && (
                <button
                  type="button"
                  className={
                    activeTab === 'blog-authors' ? 'admin-nav-item active' : 'admin-nav-item'
                  }
                  onClick={() => selectTab('blog-authors')}
                >
                  <Users size={16} />
                  Blog writers
                </button>
              )}
              {canReviewBlogPosts && (
                <button
                  type="button"
                  className={
                    activeTab === 'blog-posts' ? 'admin-nav-item active' : 'admin-nav-item'
                  }
                  onClick={() => selectTab('blog-posts')}
                >
                  <BriefcaseBusiness size={16} />
                  Blog post review
                </button>
              )}
            </>
          )}
          {canViewActivity && (
            <button
              type="button"
              className={activeTab === 'activity' ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => selectTab('activity')}
            >
              <History size={16} />
              Activity log
            </button>
          )}
        </nav>
        <div className="admin-sidebar-bottom">
          <span>Employee ID · {adminNumber}</span>
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
                  : activeTab === 'create-admin'
                    ? 'Create admin account'
                    : activeTab === 'activity'
                      ? 'Admin activity log'
                      : activeTab === 'inquiries'
                        ? 'Project inquiries'
                        : activeTab === 'blog-requests'
                          ? 'Blog writing requests'
                          : activeTab === 'blog-authors'
                            ? 'Blog writers'
                            : activeTab === 'blog-posts'
                              ? 'Blog post review'
                              : resourceConfig[activeTab as ResourceName].label}
              </h1>
              <p>
                {activeTab === 'activity'
                  ? 'Review who created, changed, uploaded, or deleted dashboard content.'
                  : activeTab === 'create-admin'
                    ? 'Create an admin account and grant only the sections you are allowed to assign.'
                    : activeTab === 'blog-requests'
                      ? 'Review contributor applications and approve writers before issuing their BLOG employee ID.'
                      : activeTab === 'blog-authors'
                        ? 'Manage writer accounts and place a writer login on hold when needed.'
                        : activeTab === 'blog-posts'
                          ? 'Review every writer submission. Articles become public only after owner approval.'
                          : 'Manage the content that appears on your public website.'}
              </p>
            </div>
            {activeTab !== 'admins' &&
              activeTab !== 'create-admin' &&
              activeTab !== 'activity' &&
              canEditActiveResource && (
                <button className="button button-accent" type="button" onClick={() => openCreate()}>
                  <Plus size={16} /> Add{' '}
                  {activeTab === 'inquiries'
                    ? 'inquiry'
                    : resourceConfig[activeTab as ResourceName].label.replace(/s$/, '')}
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

          {activeTab !== 'admins' &&
            activeTab !== 'create-admin' &&
            activeTab !== 'activity' &&
            activeTab !== 'inquiries' &&
            canEditActiveResource &&
            resourceConfig[activeTab as ResourceName].sample && (
              <aside className="admin-example">
                <div>
                  <span className="eyebrow">QUICK EXAMPLE</span>
                  <p>{resourceConfig[activeTab as ResourceName].sample?.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(resourceConfig[activeTab as ResourceName].sample)}
                >
                  Use this sample
                </button>
              </aside>
            )}

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

          {activeTab === 'admins' || activeTab === 'create-admin' ? (
            <section className="admin-editor">
              <div className="admin-editor-heading">
                <div>
                  <span className="eyebrow">CREATE ADMIN ACCOUNT</span>
                  <h2>Create an admin account</h2>
                  <p>Select each section this admin may view and edit.</p>
                  <p>
                    Each account receives a unique AZ-prefixed Employee ID, which is recorded with
                    its actions.
                  </p>
                  <p>
                    You can only grant permissions that you hold. Admin account management remains
                    owner-only.
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
                      aria-invalid={Boolean(fieldErrors.email)}
                      onChange={(event) => {
                        clearFieldError('email')
                        setNewAdmin({ ...newAdmin, email: event.target.value })
                      }}
                    />
                    {fieldErrors.email && (
                      <small className="field-error" role="alert">
                        {fieldErrors.email}
                      </small>
                    )}
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
                      aria-invalid={Boolean(fieldErrors.password)}
                      onChange={(event) => {
                        clearFieldError('password')
                        setNewAdmin({ ...newAdmin, password: event.target.value })
                      }}
                    />
                    {fieldErrors.password && (
                      <small className="field-error" role="alert">
                        {fieldErrors.password}
                      </small>
                    )}
                  </label>
                  <fieldset className="admin-permission-fieldset field-full">
                    <legend className="eyebrow">SECTION PERMISSIONS</legend>
                    <div className="admin-permission-grid">
                      {permissionOptions
                        .filter((permission) => assignableAdminPermissions.includes(permission.key))
                        .map((permission) => (
                          <label className="admin-permission-option" key={permission.key}>
                            <input
                              type="checkbox"
                              checked={newAdmin.permissions.includes(permission.key)}
                              onChange={(event) => {
                                clearFieldError('permissions')
                                const next = event.target.checked
                                  ? [...newAdmin.permissions, permission.key]
                                  : newAdmin.permissions.filter((item) => item !== permission.key)
                                setNewAdmin({ ...newAdmin, permissions: next })
                              }}
                            />
                            <span>{permission.label}</span>
                            <small>{permission.description ?? 'View and edit'}</small>
                          </label>
                        ))}
                    </div>
                    {fieldErrors.permissions && (
                      <small className="field-error" role="alert">
                        {fieldErrors.permissions}
                      </small>
                    )}
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

          {activeTab === 'admins' && editingAdminPermissions ? (
            <section className="admin-editor">
              <div className="admin-editor-heading">
                <div>
                  <span className="eyebrow">UPDATE ACCESS</span>
                  <h2>Permissions for {editingAdminPermissions.email}</h2>
                  <p>Choose the sections this admin can view and edit.</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close permissions editor"
                  onClick={() => setEditingAdminPermissions(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={saveAdminPermissions}>
                <fieldset className="admin-permission-fieldset">
                  <legend className="eyebrow">SECTION PERMISSIONS</legend>
                  <div className="admin-permission-grid">
                    {permissionOptions.map((permission) => (
                      <label className="admin-permission-option" key={permission.key}>
                        <input
                          type="checkbox"
                          checked={adminPermissionDraft.includes(permission.key)}
                          onChange={(event) => {
                            clearFieldError('permissions')
                            const next = event.target.checked
                              ? [...adminPermissionDraft, permission.key]
                              : adminPermissionDraft.filter((item) => item !== permission.key)
                            setAdminPermissionDraft(next)
                          }}
                        />
                        <span>{permission.label}</span>
                        <small>{permission.description ?? 'View and edit'}</small>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.permissions && (
                    <small className="field-error" role="alert">
                      {fieldErrors.permissions}
                    </small>
                  )}
                </fieldset>
                <div className="admin-editor-actions">
                  <button
                    className="button button-accent"
                    type="submit"
                    disabled={adminPermissionDraft.length === 0}
                  >
                    <Save size={15} /> Save permissions
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeTab !== 'admins' &&
          activeTab !== 'create-admin' &&
          activeTab !== 'activity' &&
          !activeTab.startsWith('blog-') &&
          (editing !== null || Object.keys(form).length > 0) ? (
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
                          aria-invalid={Boolean(fieldErrors[field.name])}
                          onChange={(event) => {
                            clearFieldError(field.name)
                            setForm({ ...form, [field.name]: event.target.value })
                          }}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          required={field.required}
                          aria-invalid={Boolean(fieldErrors[field.name])}
                          value={String(form[field.name] ?? field.options?.[0] ?? '')}
                          onChange={(event) => {
                            clearFieldError(field.name)
                            if (activeTab === 'projects' && field.name === 'category') {
                              const previousDefault =
                                form.category === 'Short-form' ? '9:16' : '16:9'
                              const nextDefault =
                                event.target.value === 'Short-form' ? '9:16' : '16:9'
                              setForm({
                                ...form,
                                category: event.target.value,
                                ...(form.videoAspectRatio === previousDefault
                                  ? { videoAspectRatio: nextDefault }
                                  : {}),
                              })
                            } else {
                              setForm({ ...form, [field.name]: event.target.value })
                            }
                          }}
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() +
                                option.slice(1).replaceAll('_', ' ')}
                            </option>
                          ))}
                          {activeTab === 'projects' && editing && form.status === 'archived' && (
                            <option value="archived">Archived</option>
                          )}
                          {activeTab === 'testimonials' &&
                            editing &&
                            form.status === 'archived' && (
                              <option value="archived">Archived</option>
                            )}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(form[field.name])}
                          aria-invalid={Boolean(fieldErrors[field.name])}
                          onChange={(event) => {
                            clearFieldError(field.name)
                            setForm({ ...form, [field.name]: event.target.checked })
                          }}
                        />
                      ) : field.type === 'media' ? (
                        <>
                          <input
                            type="url"
                            placeholder={
                              field.mediaResource === 'video'
                                ? 'Paste a YouTube/video link or upload from your device'
                                : 'Paste a media URL or upload a file'
                            }
                            value={String(form[field.name] ?? '')}
                            aria-invalid={Boolean(fieldErrors[field.name])}
                            onChange={(event) => {
                              clearFieldError(field.name)
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
                            aria-invalid={Boolean(fieldErrors[field.name])}
                            onChange={(event) => void uploadMedia(field, event.target.files?.[0])}
                            aria-label={`Upload ${field.label}`}
                          />
                          {activeTab === 'projects' && field.name === 'videoUrl' && (
                            <small>
                              Upload MP4, WebM, or MOV, or paste a social media link. Add a
                              thumbnail unless the link is from YouTube.
                            </small>
                          )}
                          {uploadingField === field.name && <small>Uploading securely…</small>}
                        </>
                      ) : (
                        <input
                          type={field.type ?? 'text'}
                          required={field.required}
                          min={field.min}
                          max={field.max}
                          value={String(form[field.name] ?? '')}
                          aria-invalid={Boolean(fieldErrors[field.name])}
                          onChange={(event) => {
                            clearFieldError(field.name)
                            setForm({ ...form, [field.name]: event.target.value })
                          }}
                        />
                      )}
                      {fieldErrors[field.name] && (
                        <small className="field-error" role="alert">
                          {fieldErrors[field.name]}
                        </small>
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

          {activeTab === 'blog-requests' && (
            <section className="blog-admin-guide">
              <span className="eyebrow">ISSUING WRITER ACCESS</span>
              <p>
                Approve a request, set a password of at least 12 characters, then create the
                account. The system generates a unique <strong>BLOG####</strong> Employee ID.
                Passwords are stored as hashes and cannot be viewed again after this one-time
                handoff.
              </p>
              {issuedWriterCredentials && (
                <div className="blog-issued-credentials">
                  <div>
                    <strong>Share these credentials securely</strong>
                    <span>BLOG Employee ID: {issuedWriterCredentials.employeeId}</span>
                    <span>Email: {issuedWriterCredentials.email}</span>
                    <span>Password: {issuedWriterCredentials.password}</span>
                  </div>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => void copyWriterCredentials()}>
                      Copy credentials
                    </button>
                    <button
                      type="button"
                      className="danger-action"
                      onClick={() => setIssuedWriterCredentials(null)}
                    >
                      Hide credentials
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
          <div className="admin-list-tools" hidden={activeTab === 'create-admin'}>
            <input
              type="search"
              placeholder={`Search ${
                activeTab === 'admins'
                  ? 'admin accounts'
                  : activeTab === 'create-admin'
                    ? 'admin accounts'
                    : activeTab === 'activity'
                      ? 'activity'
                      : activeTab === 'inquiries'
                        ? 'inquiries'
                        : activeTab === 'blog-requests'
                          ? 'blog writing requests'
                          : activeTab === 'blog-authors'
                            ? 'blog writers'
                            : activeTab === 'blog-posts'
                              ? 'blog posts'
                              : resourceConfig[activeTab as ResourceName].label.toLowerCase()
              }…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search content"
            />
            {activeTab !== 'admins' &&
              (activeTab === 'projects' ||
                activeTab === 'testimonials' ||
                activeTab === 'inquiries' ||
                activeTab === 'blog-posts') && (
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => selectStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {(activeTab === 'projects'
                    ? ['draft', 'published']
                    : activeTab === 'testimonials'
                      ? ['draft', 'approved', 'archived']
                      : activeTab === 'blog-posts'
                        ? ['pending', 'published', 'declined']
                        : statusOptions
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              )}
          </div>
          <div className="admin-table-wrap" hidden={activeTab === 'create-admin'}>
            {loading ? (
              <p className="admin-empty">Loading content…</p>
            ) : activeRecords.length === 0 && activeTab !== 'activity' ? (
              <p className="admin-empty">
                {activeTab === 'inquiries'
                  ? 'No inquiries yet.'
                  : activeTab === 'blog-requests'
                    ? 'No blog writing requests have been received.'
                    : activeTab === 'blog-authors'
                      ? 'No blog writer accounts have been created.'
                      : activeTab === 'blog-posts'
                        ? 'No articles have been submitted for review.'
                        : 'No content found. Use the button above to add the first item.'}
              </p>
            ) : activeTab === 'activity' ? (
              <>
                {canManageActivity && (
                  <div className="admin-row-actions activity-log-actions">
                    <button
                      type="button"
                      className="danger-action"
                      disabled={activeRecords.length === 0}
                      onClick={() => void deleteAllActivity()}
                    >
                      <Trash2 size={14} /> Delete all activity
                    </button>
                  </div>
                )}
                {activeRecords.length === 0 ? (
                  <p className="admin-empty">No admin activity has been recorded yet.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Action</th>
                        <th>Content</th>
                        <th>Changed fields</th>
                        <th>Time</th>
                        {canManageActivity && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeRecords.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <strong>{String(item.actorAdminNumber)}</strong>
                            <small>{String(item.actorEmail)}</small>
                          </td>
                          <td>
                            <span className="status-pill">{String(item.action)}</span>
                          </td>
                          <td>
                            <strong>{String(item.resource)}</strong>
                            <small>{String(item.recordLabel ?? '')}</small>
                          </td>
                          <td>
                            {Array.isArray(item.changedFields)
                              ? (item.changedFields as string[]).join(', ') || '—'
                              : '—'}
                          </td>
                          <td>
                            {typeof item.createdAt === 'string'
                              ? new Date(item.createdAt).toLocaleString()
                              : '—'}
                          </td>
                          {canManageActivity && (
                            <td>
                              <button
                                type="button"
                                className="danger-action activity-delete-button"
                                aria-label={`Delete activity: ${String(item.action)} ${String(item.resource)}`}
                                onClick={() => void deleteActivity(item)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : activeTab === 'admins' ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Email</th>
                    <th>Login</th>
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
                          <strong>{admin.adminNumber}</strong>
                        </td>
                        <td>
                          <strong>{admin.email}</strong>
                        </td>
                        <td>
                          <span className="status-pill">
                            {admin.loginHeld ? 'On hold' : 'Active'}
                          </span>
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
                            <div className="admin-row-actions">
                              <button type="button" onClick={() => void setAdminLoginHold(admin)}>
                                {admin.loginHeld ? 'Restore login' : 'Hold login'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdminPermissions(admin)
                                  setAdminPermissionDraft(admin.permissions ?? [])
                                }}
                              >
                                Edit permissions
                              </button>
                              <button
                                type="button"
                                className="danger-action"
                                onClick={() => void revokeAdmin(admin)}
                              >
                                Revoke access
                              </button>
                            </div>
                          ) : (
                            <span>Protected</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : activeTab === 'blog-requests' ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Experience / motivation</th>
                    <th>Status</th>
                    <th>Review / account</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong>{String(record.name)}</strong>
                        <small>{String(record.email)}</small>
                        <small>{String(record.contactNumber)}</small>
                        <small>
                          {String(record.socialPlatform)} · {String(record.yearsExperience)} years
                        </small>
                      </td>
                      <td className="blog-admin-motivation">{String(record.motivation)}</td>
                      <td>
                        <span className="status-pill">{String(record.status)}</span>
                      </td>
                      <td>
                        {record.status === 'pending' ? (
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              onClick={() => void reviewBlogRequest(record, 'approved')}
                            >
                              Approve request
                            </button>
                            <button
                              type="button"
                              className="danger-action"
                              onClick={() => void reviewBlogRequest(record, 'declined')}
                            >
                              Decline
                            </button>
                          </div>
                        ) : record.status === 'approved' ? (
                          <div className="blog-account-issue">
                            <label className="field">
                              <span>Set initial password (12+ characters)</span>
                              <input
                                type="password"
                                minLength={12}
                                autoComplete="new-password"
                                value={writerPasswords[record._id] ?? ''}
                                aria-invalid={Boolean(fieldErrors.password)}
                                onChange={(event) => {
                                  clearFieldError('password')
                                  setWriterPasswords((current) => ({
                                    ...current,
                                    [record._id]: event.target.value,
                                  }))
                                }}
                              />
                              {fieldErrors.password && (
                                <small className="field-error" role="alert">
                                  {fieldErrors.password}
                                </small>
                              )}
                            </label>
                            <button
                              type="button"
                              disabled={(writerPasswords[record._id] ?? '').length < 12}
                              onClick={() => void createBlogAuthor(record)}
                            >
                              Create BLOG ID and account
                            </button>
                            <small>
                              Share the generated ID and password with the approved writer securely.
                            </small>
                          </div>
                        ) : (
                          <span>
                            {record.status === 'account_created'
                              ? 'Writer account issued'
                              : 'No action'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === 'blog-authors' ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>BLOG Employee ID</th>
                    <th>Writer</th>
                    <th>Login</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong>{String(record.employeeId)}</strong>
                      </td>
                      <td>
                        <strong>{String(record.name)}</strong>
                        <small>{String(record.email)}</small>
                      </td>
                      <td>
                        <span className="status-pill">
                          {record.loginHeld ? 'On hold' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {typeof record.createdAt === 'string'
                          ? new Date(record.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <button type="button" onClick={() => void setBlogAuthorLoginHold(record)}>
                          {record.loginHeld ? 'Restore login' : 'Hold login'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === 'blog-posts' ? (
              <>
                {editingBlogPost && (
                  <form className="admin-editor" onSubmit={saveBlogPost}>
                    <div className="admin-editor-heading">
                      <div>
                        <span className="eyebrow">EDIT BLOG ARTICLE</span>
                        <h2>{String(editingBlogPost.title)}</h2>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Close article editor"
                        onClick={() => setEditingBlogPost(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="admin-form-grid">
                      <label className="field">
                        <span>Article title</span>
                        <input
                          required
                          minLength={5}
                          maxLength={180}
                          value={blogPostDraft.title}
                          onChange={(event) =>
                            setBlogPostDraft({ ...blogPostDraft, title: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Topic / category</span>
                        <input
                          required
                          minLength={2}
                          maxLength={80}
                          value={blogPostDraft.category}
                          onChange={(event) =>
                            setBlogPostDraft({ ...blogPostDraft, category: event.target.value })
                          }
                        />
                      </label>
                      <label className="field field-full">
                        <span>Short introduction</span>
                        <textarea
                          required
                          minLength={20}
                          maxLength={400}
                          rows={3}
                          value={blogPostDraft.excerpt}
                          onChange={(event) =>
                            setBlogPostDraft({ ...blogPostDraft, excerpt: event.target.value })
                          }
                        />
                      </label>
                      <label className="field field-full">
                        <span>Article</span>
                        <textarea
                          required
                          minLength={100}
                          maxLength={30000}
                          rows={12}
                          value={blogPostDraft.content}
                          onChange={(event) =>
                            setBlogPostDraft({ ...blogPostDraft, content: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="admin-editor-actions">
                      <button className="button button-accent" type="submit">
                        <Save size={15} /> Save article
                      </button>
                    </div>
                  </form>
                )}
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Author</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecords.map((record) => (
                      <tr key={record._id}>
                        <td className="blog-admin-article">
                          <strong>{String(record.title)}</strong>
                          <small>{String(record.category)}</small>
                          <p>{String(record.excerpt)}</p>
                          <details>
                            <summary>Read full submission</summary>
                            <p>{String(record.content)}</p>
                          </details>
                        </td>
                        <td>
                          <strong>{String(record.authorName)}</strong>
                          <small>{String(record.slug)}</small>
                        </td>
                        <td>
                          <span className="status-pill">{String(record.status)}</span>
                          <label className="field blog-status-control">
                            <span>Change status</span>
                            <select
                              value={blogPostStatusDraft[record._id] ?? String(record.status)}
                              onChange={(event) =>
                                setBlogPostStatusDraft({
                                  ...blogPostStatusDraft,
                                  [record._id]: event.target.value,
                                })
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="published">Published</option>
                              <option value="declined">Declined</option>
                            </select>
                          </label>
                          {(blogPostStatusDraft[record._id] ?? String(record.status)) !==
                            String(record.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = blogPostStatusDraft[record._id]
                                if (
                                  nextStatus === 'pending' ||
                                  nextStatus === 'published' ||
                                  nextStatus === 'declined'
                                ) {
                                  void reviewBlogPost(record, nextStatus)
                                }
                              }}
                            >
                              Save status
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => editBlogPost(record)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-action"
                              onClick={() => void deleteBlogPost(record)}
                            >
                              Delete
                            </button>
                          </div>
                          {record.status === 'pending' && (
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                onClick={() => void reviewBlogPost(record, 'published')}
                              >
                                Approve & publish
                              </button>
                              <button
                                type="button"
                                className="danger-action"
                                onClick={() => void reviewBlogPost(record, 'declined')}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
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
                        {typeof item.contactNumber === 'string' && item.contactNumber && (
                          <small>Phone: {item.contactNumber}</small>
                        )}
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
          {activeTab !== 'create-admin' && !loading && contentPages > 1 && (
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
