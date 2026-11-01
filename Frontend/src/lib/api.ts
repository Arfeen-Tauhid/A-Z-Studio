export type Project = {
  _id: string
  slug: string
  title: string
  category: string
  description: string
  videoAspectRatio?: '16:9' | '9:16' | '1:1' | '4:5'
  thumbnailUrl?: string
  videoUrl?: string
  clientName?: string
  brief?: string
  approach?: string
  deliverables?: string[]
}

export type StudioService = {
  _id: string
  title: string
  description: string
  deliverables: string[]
}

export type SiteSettings = {
  studioEmail?: string
  discordId?: string
  contactNumber?: string
  instagramUrl?: string
  youtubeUrl?: string
  linkedinUrl?: string
  homeHeadline?: string
  homeDescription?: string
  showreelUrl?: string
}

export type PageResult<T> = {
  items: T[]
  page: number
  pages: number
  total: number
}

export type ApiFieldError = { field: string; message: string }

export class ApiRequestError extends Error {
  public readonly details: ApiFieldError[]
  public readonly status: number

  constructor(message: string, details: ApiFieldError[] = [], status = 0) {
    super(message)
    this.name = 'ApiRequestError'
    this.details = details
    this.status = status
  }
}

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) return undefined as T

  let payload: {
    data?: T
    error?: { message?: string; details?: ApiFieldError[] }
  } | null
  try {
    payload = (await response.json()) as {
      data?: T
      error?: { message?: string; details?: ApiFieldError[] }
    }
  } catch {
    if (response.ok) throw new Error('The server returned an invalid response.')
    payload = null
  }

  if (!response.ok) {
    throw new ApiRequestError(
      payload?.error?.message ?? `Request failed (${response.status})`,
      payload?.error?.details ?? [],
      response.status,
    )
  }

  return (payload?.data ?? payload) as T
}
