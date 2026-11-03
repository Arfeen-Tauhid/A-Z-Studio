import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Eye,
  Heart,
  LogOut,
  Send,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AutoScrollRow } from '../components/ui/AutoScrollRow'
import { apiRequest, ApiRequestError, type PageResult } from '../lib/api'

type BlogPost = {
  _id: string
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  authorName: string
  status?: string
  publishedAt?: string
  viewCount?: number
  likeCount?: number
  authorEmployeeId?: string
  createdAt: string
  updatedAt?: string
}
type BlogAuthor = { employeeId: string; email: string; name: string }
type WritingRequest = {
  name: string
  socialPlatform: string
  yearsExperience: string
  motivation: string
  email: string
  contactNumber: string
}
type BlogDraft = { title: string; category: string; excerpt: string; content: string }
type BlogSections = { recent: BlogPost[]; views: BlogPost[]; likes: BlogPost[] }

const emptySections: BlogSections = { recent: [], views: [], likes: [] }

function readLikedPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem('az-blog-liked-posts') ?? '[]')
    return Array.isArray(saved) && saved.every((slug) => typeof slug === 'string') ? saved : []
  } catch {
    return []
  }
}

const emptyRequest: WritingRequest = {
  name: '',
  socialPlatform: '',
  yearsExperience: '',
  motivation: '',
  email: '',
  contactNumber: '',
}
const emptyDraft: BlogDraft = { title: '', category: '', excerpt: '', content: '' }

export function BlogsPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionGeneration = useRef(0)
  const viewedPosts = useRef(new Set<string>())
  const [sections, setSections] = useState<BlogSections>(emptySections)
  const [likedPosts, setLikedPosts] = useState<string[]>(readLikedPosts)
  const [likingPosts, setLikingPosts] = useState<string[]>([])
  const likedPostsRef = useRef(new Set(likedPosts))
  const likingPostsRef = useRef(new Set<string>())
  const [post, setPost] = useState<BlogPost | null>(null)
  const [author, setAuthor] = useState<BlogAuthor | null>(null)
  const [request, setRequest] = useState(emptyRequest)
  const [draft, setDraft] = useState(emptyDraft)
  const [identifier, setIdentifier] = useState('')
  const [authorIdInput, setAuthorIdInput] = useState(searchParams.get('author') ?? '')
  const [password, setPassword] = useState('')
  const [authorPosts, setAuthorPosts] = useState<BlogPost[]>([])
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadedRoute, setLoadedRoute] = useState<string>()
  const [loadedAuthorFilter, setLoadedAuthorFilter] = useState<string>()
  const routeKey = slug ?? ''
  const authorIdFilter = (searchParams.get('author') ?? '').toUpperCase()
  const loadingArticle = Boolean(slug) && loadedRoute !== routeKey
  const loadingSections = !slug && loadedAuthorFilter !== authorIdFilter
  const featuredPosts = Array.from(
    new Map(
      [...sections.recent, ...sections.views, ...sections.likes].map((item) => [item.slug, item]),
    ).values(),
  )
  const featuredViews = featuredPosts.reduce((total, item) => total + (item.viewCount ?? 0), 0)
  const featuredLikes = featuredPosts.reduce((total, item) => total + (item.likeCount ?? 0), 0)

  useEffect(() => {
    let active = true
    if (slug) {
      apiRequest<BlogPost>(`/api/public/blogs/${encodeURIComponent(slug)}`)
        .then((result) => {
          if (active) {
            setError('')
            setPost(result)
          }
        })
        .catch((requestError: unknown) => {
          if (active) {
            setPost(null)
            setError(
              requestError instanceof Error ? requestError.message : 'Could not load this article.',
            )
          }
        })
        .finally(() => {
          if (active) setLoadedRoute(routeKey)
        })
    }
    return () => {
      active = false
    }
  }, [routeKey, slug])

  useEffect(() => {
    if (slug) return
    let active = true
    let requestId = 0
    const refreshSections = async () => {
      const currentRequestId = ++requestId
      const authorQuery = authorIdFilter ? `&author=${encodeURIComponent(authorIdFilter)}` : ''
      try {
        const [recent, views, likes] = await Promise.all(
          (['recent', 'views', 'likes'] as const).map((sort) =>
            apiRequest<PageResult<BlogPost>>(
              `/api/public/blogs?sort=${sort}&limit=10${authorQuery}`,
            ),
          ),
        )
        if (!active || currentRequestId !== requestId) return
        setSections({
          recent: recent.items,
          views: views.items,
          likes: likes.items,
        })
        setError('')
      } catch (requestError: unknown) {
        if (active && currentRequestId === requestId) {
          setSections(emptySections)
          setError(requestError instanceof Error ? requestError.message : 'Could not load blogs.')
        }
      } finally {
        if (active && currentRequestId === requestId) setLoadedAuthorFilter(authorIdFilter)
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshSections()
    }
    void refreshSections()
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [authorIdFilter, slug])

  function updateEngagementCount(slug: string, metric: 'viewCount' | 'likeCount', count: number) {
    const updatedItems = (items: BlogPost[]) =>
      items.map((blogPost) =>
        blogPost.slug === slug
          ? { ...blogPost, [metric]: Math.max(blogPost[metric] ?? 0, count) }
          : blogPost,
      )
    setSections((current) => ({
      recent: updatedItems(current.recent),
      views: updatedItems(current.views).sort(
        (left, right) =>
          (right.viewCount ?? 0) - (left.viewCount ?? 0) ||
          Date.parse(right.publishedAt ?? right.createdAt) -
            Date.parse(left.publishedAt ?? left.createdAt),
      ),
      likes: updatedItems(current.likes).sort(
        (left, right) =>
          (right.likeCount ?? 0) - (left.likeCount ?? 0) ||
          Date.parse(right.publishedAt ?? right.createdAt) -
            Date.parse(left.publishedAt ?? left.createdAt),
      ),
    }))
    setPost((current) =>
      current?.slug === slug
        ? { ...current, [metric]: Math.max(current[metric] ?? 0, count) }
        : current,
    )
  }

  function recordBlogView(item: BlogPost) {
    const viewedKey = `az-blog-viewed-${item.slug}`
    try {
      if (viewedPosts.current.has(item.slug) || sessionStorage.getItem(viewedKey)) return
      sessionStorage.setItem(viewedKey, 'true')
    } catch {
      if (viewedPosts.current.has(item.slug)) return
    }
    viewedPosts.current.add(item.slug)
    void apiRequest<{ viewCount: number }>(
      `/api/public/blogs/${encodeURIComponent(item.slug)}/view`,
      { method: 'POST' },
    )
      .then(({ viewCount }) => {
        updateEngagementCount(item.slug, 'viewCount', viewCount)
      })
      .catch((requestError: unknown) => {
        viewedPosts.current.delete(item.slug)
        try {
          sessionStorage.removeItem(viewedKey)
        } catch {
          viewedPosts.current.delete(item.slug)
        }
        setError(
          requestError instanceof Error ? requestError.message : 'Could not record this view.',
        )
      })
  }

  useEffect(() => {
    if (post) recordBlogView(post)
  }, [post])

  useEffect(() => {
    const requestGeneration = sessionGeneration.current
    apiRequest<BlogAuthor>('/api/blog/auth/me')
      .then((currentAuthor) => {
        if (requestGeneration === sessionGeneration.current) setAuthor(currentAuthor)
      })
      .catch((requestError: unknown) => {
        if (requestGeneration !== sessionGeneration.current) return
        setAuthor(null)
        if (!(requestError instanceof ApiRequestError && requestError.status === 401)) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not verify the blog writer session.',
          )
        }
      })
  }, [])

  useEffect(() => {
    if (!author) return
    let active = true
    apiRequest<BlogPost[]>('/api/blog/author/posts')
      .then((items) => {
        if (active) setAuthorPosts(items)
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : 'Could not load your articles.',
          )
      })
    return () => {
      active = false
    }
  }, [author])

  function applyFieldErrors(requestError: unknown) {
    if (requestError instanceof ApiRequestError && requestError.details.length > 0) {
      setFieldErrors(
        Object.fromEntries(requestError.details.map(({ field, message }) => [field, message])),
      )
      setError('Please correct the highlighted fields.')
      return
    }
    setFieldErrors({})
    setError(requestError instanceof Error ? requestError.message : 'Something went wrong.')
  }

  function updateRequest<K extends keyof WritingRequest>(field: K, value: WritingRequest[K]) {
    setRequest((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function updateDraft<K extends keyof BlogDraft>(field: K, value: BlogDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function submitWritingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      await apiRequest('/api/public/blog-writing-requests', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      setRequest(emptyRequest)
      setNotice('Your writing request has been sent. The studio will review it and contact you.')
    } catch (requestError) {
      applyFieldErrors(requestError)
    }
  }

  function filterByAuthor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const employeeId = authorIdInput.trim().toUpperCase()
    setSearchParams(employeeId ? { author: employeeId } : {})
  }

  async function likePost(item: BlogPost) {
    if (likedPostsRef.current.has(item.slug) || likingPostsRef.current.has(item.slug)) return
    likingPostsRef.current.add(item.slug)
    setLikingPosts([...likingPostsRef.current])
    setError('')
    likedPostsRef.current.add(item.slug)
    const nextLikedPosts = [...likedPostsRef.current]
    try {
      localStorage.setItem('az-blog-liked-posts', JSON.stringify(nextLikedPosts))
    } catch {
      likedPostsRef.current.delete(item.slug)
      likingPostsRef.current.delete(item.slug)
      setLikingPosts([...likingPostsRef.current])
      setError('Your browser could not save the like preference.')
      return
    }
    setLikedPosts(nextLikedPosts)
    try {
      const { likeCount } = await apiRequest<{ likeCount: number }>(
        `/api/public/blogs/${encodeURIComponent(item.slug)}/like`,
        { method: 'POST' },
      )
      updateEngagementCount(item.slug, 'likeCount', likeCount)
    } catch (requestError) {
      likedPostsRef.current.delete(item.slug)
      const restoredLikedPosts = [...likedPostsRef.current]
      setLikedPosts(restoredLikedPosts)
      let storageError = false
      try {
        localStorage.setItem('az-blog-liked-posts', JSON.stringify(restoredLikedPosts))
      } catch {
        storageError = true
      }
      setError(
        storageError
          ? 'Your browser could not save the like preference.'
          : requestError instanceof Error
            ? requestError.message
            : 'Could not like this article.',
      )
    } finally {
      likingPostsRef.current.delete(item.slug)
      setLikingPosts([...likingPostsRef.current])
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      const currentAuthor = await apiRequest<BlogAuthor>('/api/blog/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      })
      sessionGeneration.current += 1
      setAuthor(currentAuthor)
      setPassword('')
      setNotice(`Signed in as ${currentAuthor.employeeId}.`)
    } catch (requestError) {
      applyFieldErrors(requestError)
    }
  }

  async function signOut() {
    try {
      await apiRequest('/api/blog/auth/logout', { method: 'POST' })
      sessionGeneration.current += 1
      setAuthor(null)
      setAuthorPosts([])
      setNotice('You have signed out.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign out.')
    }
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      await apiRequest(
        editingPostId ? `/api/blog/author/posts/${editingPostId}` : '/api/blog/author/posts',
        {
          method: editingPostId ? 'PATCH' : 'POST',
          body: JSON.stringify(draft),
        },
      )
      setDraft(emptyDraft)
      setEditingPostId(null)
      setNotice(
        editingPostId
          ? 'Your changes were submitted for owner review.'
          : 'Article submitted for owner review. It will appear publicly after approval.',
      )
      setAuthorPosts(await apiRequest<BlogPost[]>('/api/blog/author/posts'))
    } catch (requestError) {
      applyFieldErrors(requestError)
    }
  }

  const dateLabel = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : ''

  const blogCard = (item: BlogPost) => (
    <article className="blog-card" key={item._id}>
      <span className="eyebrow">{item.category}</span>
      <h3>
        <Link to={`/blogs/${item.slug}`}>{item.title}</Link>
      </h3>
      <p>{item.excerpt}</p>
      <div className="blog-card-meta">
        <span>{item.authorName}</span>
        {item.authorEmployeeId && (
          <Link
            className="blog-author-filter-link"
            to={`/blogs?author=${encodeURIComponent(item.authorEmployeeId)}`}
            onClick={() => setAuthorIdInput(item.authorEmployeeId ?? '')}
          >
            {item.authorEmployeeId}
          </Link>
        )}
        <span>{dateLabel(item.publishedAt)}</span>
      </div>
      <div className="blog-card-footer">
        <Link to={`/blogs/${item.slug}`} aria-label={`Read ${item.title}`}>
          Read article <ArrowRight size={15} />
        </Link>
        <span className="blog-engagement">
          <span>
            <Eye size={14} /> {item.viewCount ?? 0}
          </span>
          <button
            type="button"
            className={likedPosts.includes(item.slug) ? 'blog-like is-liked' : 'blog-like'}
            aria-label={`${likedPosts.includes(item.slug) ? 'Liked' : 'Like'} ${item.title}`}
            aria-pressed={likedPosts.includes(item.slug)}
            disabled={likedPosts.includes(item.slug) || likingPosts.includes(item.slug)}
            onClick={() => void likePost(item)}
          >
            <Heart size={14} fill={likedPosts.includes(item.slug) ? 'currentColor' : 'none'} />
            {item.likeCount ?? 0}
          </button>
        </span>
      </div>
    </article>
  )

  return (
    <div className="shell page-shell blog-page">
      {slug && (
        <Link className="back-link" to="/blogs">
          <ArrowLeft size={14} /> All blogs
        </Link>
      )}
      {(error || notice) && (
        <p className={error ? 'admin-alert' : 'admin-notice'} role={error ? 'alert' : 'status'}>
          {error || notice}
        </p>
      )}

      {slug ? (
        loadingArticle ? (
          <p className="admin-empty">Loading article…</p>
        ) : post ? (
          <article className="blog-article">
            <span className="eyebrow">{post.category}</span>
            <h1>{post.title}</h1>
            <p className="blog-meta">
              By {post.authorName}
              {post.authorEmployeeId && (
                <>
                  {' · '}
                  <Link
                    className="blog-author-filter-link"
                    to={`/blogs?author=${encodeURIComponent(post.authorEmployeeId)}`}
                    onClick={() => setAuthorIdInput(post.authorEmployeeId ?? '')}
                  >
                    {post.authorEmployeeId}
                  </Link>
                </>
              )}
              {' · '}
              {dateLabel(post.publishedAt)}
            </p>
            <p className="blog-excerpt">{post.excerpt}</p>
            <div className="blog-content">{post.content}</div>
            <div className="blog-article-actions">
              <span>
                <Eye size={15} /> {post.viewCount ?? 0} views
              </span>
              <button
                type="button"
                className={likedPosts.includes(post.slug) ? 'blog-like is-liked' : 'blog-like'}
                aria-pressed={likedPosts.includes(post.slug)}
                disabled={likedPosts.includes(post.slug) || likingPosts.includes(post.slug)}
                onClick={() => void likePost(post)}
              >
                <Heart size={16} fill={likedPosts.includes(post.slug) ? 'currentColor' : 'none'} />
                {likedPosts.includes(post.slug) ? 'Liked' : 'Like article'} · {post.likeCount ?? 0}
              </button>
            </div>
          </article>
        ) : (
          <p className="inline-error">This article could not be found.</p>
        )
      ) : (
        <>
          {(
            [
              ['recent', 'Newly Posted', 'Fresh articles from the community.'],
              ['views', 'Most Viewed', 'Stories readers are spending time with.'],
              ['likes', 'Most Liked', 'Community favorites.'],
            ] as const
          ).map(([key, title, description]) => (
            <section
              className="blog-section"
              id={key === 'recent' ? 'blog-recent' : undefined}
              key={key}
              aria-label={title}
            >
              <div className="blog-section-heading">
                <div>
                  <span className="eyebrow">BLOGS / {key.toUpperCase()}</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </div>
              {loadingSections ? (
                <p className="admin-empty">Loading articles…</p>
              ) : sections[key].length ? (
                <AutoScrollRow
                  items={sections[key]}
                  label={`${title} blog articles`}
                  className="blog-grid auto-scroll-blog-grid"
                  itemClassName="auto-scroll-item blog-carousel-item"
                  onItemVisible={(item) => recordBlogView(item)}
                  renderItem={blogCard}
                />
              ) : (
                <div className="blog-empty">
                  <BookOpen size={20} />
                  <p>
                    {authorIdFilter
                      ? 'No published articles were found for this writer yet.'
                      : 'Published articles will appear here soon.'}
                  </p>
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {!slug && (
        <section className="blog-author-area">
          {author ? (
            <div className="blog-author-panel">
              <div className="blog-author-heading">
                <div>
                  <span className="eyebrow">BLOG WRITER · {author.employeeId}</span>
                  <h2>Welcome, {author.name}.</h2>
                  <p>Your new articles go to the studio owner for review before publication.</p>
                </div>
                <button type="button" className="admin-cancel" onClick={() => void signOut()}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
              <form className="inquiry-form" onSubmit={submitPost}>
                <h3>{editingPostId ? 'Resubmit article for review' : 'Write an article'}</h3>
                <div className="form-grid">
                  <label className="field">
                    <span>Article title</span>
                    <input
                      required
                      minLength={5}
                      maxLength={180}
                      value={draft.title}
                      onChange={(event) => updateDraft('title', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.title)}
                    />
                    {fieldErrors.title && (
                      <small className="field-error">{fieldErrors.title}</small>
                    )}
                  </label>
                  <label className="field">
                    <span>Topic / category</span>
                    <input
                      required
                      maxLength={80}
                      value={draft.category}
                      onChange={(event) => updateDraft('category', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.category)}
                    />
                    {fieldErrors.category && (
                      <small className="field-error">{fieldErrors.category}</small>
                    )}
                  </label>
                  <label className="field field-full">
                    <span>Short introduction</span>
                    <textarea
                      rows={3}
                      required
                      minLength={20}
                      maxLength={400}
                      value={draft.excerpt}
                      onChange={(event) => updateDraft('excerpt', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.excerpt)}
                    />
                    {fieldErrors.excerpt && (
                      <small className="field-error">{fieldErrors.excerpt}</small>
                    )}
                  </label>
                  <label className="field field-full">
                    <span>Article</span>
                    <textarea
                      rows={12}
                      required
                      minLength={100}
                      maxLength={30000}
                      value={draft.content}
                      onChange={(event) => updateDraft('content', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.content)}
                    />
                    {fieldErrors.content && (
                      <small className="field-error">{fieldErrors.content}</small>
                    )}
                  </label>
                </div>
                <button className="button button-accent" type="submit">
                  <Send size={15} /> {editingPostId ? 'Resubmit for review' : 'Submit for review'}
                </button>
                {editingPostId && (
                  <button
                    className="admin-cancel"
                    type="button"
                    onClick={() => {
                      setEditingPostId(null)
                      setDraft(emptyDraft)
                    }}
                  >
                    Cancel editing
                  </button>
                )}
              </form>
              <div className="blog-author-posts">
                <h3>Your articles</h3>
                {authorPosts.length ? (
                  authorPosts.map((item) => (
                    <article key={item._id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {item.status} · Updated {dateLabel(item.updatedAt ?? item.createdAt)}
                        </small>
                      </div>
                      {item.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraft({
                              title: item.title,
                              category: item.category,
                              excerpt: item.excerpt,
                              content: item.content,
                            })
                            setEditingPostId(item._id)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          Edit / resubmit
                        </button>
                      )}
                    </article>
                  ))
                ) : (
                  <p>You have not submitted an article yet.</p>
                )}
              </div>
            </div>
          ) : (
            <details className="blog-writer-access">
              <summary>
                Writer access <span>Sign in or request permission to contribute</span>
              </summary>
              <div className="blog-author-grid">
                <form className="inquiry-form blog-access-card" onSubmit={signIn}>
                  <span className="eyebrow">WRITER ACCESS</span>
                  <h2>Log in to write</h2>
                  <p>
                    Use your email or BLOG employee ID with the password provided by the studio.
                  </p>
                  <label className="field">
                    <span>Email or BLOG employee ID</span>
                    <input
                      required
                      autoComplete="username"
                      placeholder="writer@example.com or BLOG1234"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      aria-invalid={Boolean(fieldErrors.identifier)}
                    />
                    {fieldErrors.identifier && (
                      <small className="field-error">{fieldErrors.identifier}</small>
                    )}
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
                  <button className="button button-accent" type="submit">
                    Log in <ArrowRight size={15} />
                  </button>
                </form>

                <form className="inquiry-form blog-access-card" onSubmit={submitWritingRequest}>
                  <span className="eyebrow">JOIN OUR CONTRIBUTORS</span>
                  <h2>Request to write</h2>
                  <p>Tell us about your experience and why you would like to contribute.</p>
                  <div className="form-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        value={request.name}
                        onChange={(event) => updateRequest('name', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.name)}
                      />
                      {fieldErrors.name && (
                        <small className="field-error">{fieldErrors.name}</small>
                      )}
                    </label>
                    <label className="field">
                      <span>Social media platform</span>
                      <input
                        required
                        placeholder="YouTube, Instagram, LinkedIn…"
                        value={request.socialPlatform}
                        onChange={(event) => updateRequest('socialPlatform', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.socialPlatform)}
                      />
                      {fieldErrors.socialPlatform && (
                        <small className="field-error">{fieldErrors.socialPlatform}</small>
                      )}
                    </label>
                    <label className="field">
                      <span>Years in video editing</span>
                      <input
                        type="number"
                        required
                        min={0}
                        max={80}
                        step={1}
                        value={request.yearsExperience}
                        onChange={(event) => updateRequest('yearsExperience', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.yearsExperience)}
                      />
                      {fieldErrors.yearsExperience && (
                        <small className="field-error">{fieldErrors.yearsExperience}</small>
                      )}
                    </label>
                    <label className="field">
                      <span>Email address</span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={request.email}
                        onChange={(event) => updateRequest('email', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.email)}
                      />
                      {fieldErrors.email && (
                        <small className="field-error">{fieldErrors.email}</small>
                      )}
                    </label>
                    <label className="field field-full">
                      <span>Contact number with country code</span>
                      <input
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="+1 555 123 4567"
                        value={request.contactNumber}
                        onChange={(event) => updateRequest('contactNumber', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.contactNumber)}
                      />
                      {fieldErrors.contactNumber && (
                        <small className="field-error">{fieldErrors.contactNumber}</small>
                      )}
                    </label>
                    <label className="field field-full">
                      <span>Why do you want to write for our blog?</span>
                      <textarea
                        rows={4}
                        required
                        minLength={20}
                        maxLength={3000}
                        value={request.motivation}
                        onChange={(event) => updateRequest('motivation', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.motivation)}
                      />
                      {fieldErrors.motivation && (
                        <small className="field-error">{fieldErrors.motivation}</small>
                      )}
                    </label>
                  </div>
                  <button className="button button-accent" type="submit">
                    Send writing request <ArrowRight size={15} />
                  </button>
                </form>
              </div>
            </details>
          )}
        </section>
      )}
      {!slug && (
        <>
          <form className="blog-toolbar" onSubmit={filterByAuthor}>
            <div>
              <span className="eyebrow">DISCOVER ARTICLES</span>
              <p>Browse recent stories, or find a writer by their BLOG Employee ID.</p>
            </div>
            <label className="field">
              <span>Filter by writer ID</span>
              <input
                value={authorIdInput}
                onChange={(event) => setAuthorIdInput(event.target.value)}
                placeholder="BLOG1234"
                aria-label="Filter blog posts by BLOG writer ID"
              />
            </label>
            <button type="submit" className="button button-accent">
              Find posts <ArrowRight size={15} />
            </button>
            {authorIdFilter && (
              <button
                type="button"
                className="blog-clear-filter"
                onClick={() => {
                  setAuthorIdInput('')
                  setSearchParams({})
                }}
              >
                Clear {authorIdFilter} filter
              </button>
            )}
          </form>
          {authorIdFilter && (
            <p className="blog-filter-label">
              Showing published posts by <strong>{authorIdFilter}</strong>
            </p>
          )}
          <section className="blog-hero" aria-labelledby="blog-hero-title">
            <div className="blog-hero-copy">
              <span className="eyebrow">THE A Z JOURNAL · VIDEO & STORYTELLING</span>
              <h1 id="blog-hero-title">
                Ideas for the
                <br />
                <span>next cut.</span>
              </h1>
              <p>
                Fresh perspectives, practical lessons, and stories from the people shaping video
                storytelling.
              </p>
              <a className="blog-hero-link" href="#blog-recent">
                Explore the stories <ArrowRight size={15} />
              </a>
            </div>
            <aside className="blog-hero-stats" aria-label="Engagement across featured stories">
              <span className="blog-hero-stats-label">COMMUNITY PULSE</span>
              <div>
                <strong>{loadingSections ? '—' : featuredPosts.length.toLocaleString()}</strong>
                <span>Featured stories</span>
              </div>
              <div>
                <strong>{loadingSections ? '—' : featuredViews.toLocaleString()}</strong>
                <span>Reads across featured stories</span>
              </div>
              <div>
                <strong>{loadingSections ? '—' : featuredLikes.toLocaleString()}</strong>
                <span>Likes across featured stories</span>
              </div>
              <span className="blog-hero-stats-note">Counts update as readers engage.</span>
            </aside>
            <span className="blog-hero-orbit blog-hero-orbit-one" aria-hidden="true" />
            <span className="blog-hero-orbit blog-hero-orbit-two" aria-hidden="true" />
          </section>
        </>
      )}
    </div>
  )
}
