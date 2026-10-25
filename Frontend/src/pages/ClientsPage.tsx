import { ArrowUpRight, Star } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

type Client = {
  _id: string
  name: string
  videoUrl?: string
  videoThumbnailUrl?: string
  commentScreenshotUrl?: string
  socialPlatform?: string
  socialHandle?: string
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ratingAverage, setRatingAverage] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [rating, setRating] = useState(0)
  const [reviewerName, setReviewerName] = useState('')
  const [socialPlatform, setSocialPlatform] = useState('')
  const [customSocialPlatform, setCustomSocialPlatform] = useState('')
  const [socialHandle, setSocialHandle] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    Promise.all([
      apiRequest<Client[]>('/api/public/clients'),
      apiRequest<{ average: number; count: number }>('/api/public/ratings'),
    ])
      .then(([clientItems, ratingSummary]) => {
        setClients(clientItems)
        setRatingAverage(ratingSummary.average)
        setRatingCount(ratingSummary.count)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  async function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReviewError('')
    setReviewNotice('')
    setSubmittingRating(true)
    try {
      const result = await apiRequest<{ average: number; count: number; message: string }>(
        '/api/public/ratings',
        {
          method: 'POST',
          body: JSON.stringify({
            rating,
            name: reviewerName,
            socialPlatform:
              socialPlatform === 'Other' ? customSocialPlatform.trim() : socialPlatform,
            socialHandle,
          }),
        },
      )
      setRatingAverage(result.average)
      setRatingCount(result.count)
      setReviewNotice(result.message)
      setRating(0)
      setReviewerName('')
      setSocialPlatform('')
      setCustomSocialPlatform('')
      setSocialHandle('')
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Your rating could not be sent.')
    } finally {
      setSubmittingRating(false)
    }
  }

  return (
    <div className="shell page-shell">
      <div className="page-intro">
        <span className="eyebrow">CLIENT STORIES</span>
        <h1>
          Our work,
          <br />
          <em>in good company.</em>
        </h1>
        <p>
          A closer look at the work we create with our clients, alongside feedback shared with
          permission. Based in a global creative community, we collaborate with clients across the
          United States, the Gulf region, and beyond.
        </p>
      </div>
      {state === 'loading' && <p className="muted-copy">Loading client stories…</p>}
      {state === 'error' && (
        <p className="inline-error">
          Client stories are temporarily unavailable. Please try again shortly.
        </p>
      )}
      {state === 'ready' && clients.length > 0 && (
        <section className="client-grid" aria-label="Client showcases">
          {clients.map((client) => (
            <article className="client-card" key={client._id}>
              <h2>{client.name}</h2>
              {client.socialHandle && (
                <p className="client-social">
                  {client.socialPlatform ? `${client.socialPlatform} · ` : ''}
                  {client.socialHandle}
                </p>
              )}
              {client.videoUrl && (
                <video
                  className="client-video"
                  controls
                  playsInline
                  preload="none"
                  poster={client.videoThumbnailUrl}
                  aria-label={`${client.name} video`}
                >
                  <source src={client.videoUrl} />
                  Your browser does not support video playback.
                </video>
              )}
              {client.commentScreenshotUrl && (
                <a
                  className="client-comment"
                  href={client.commentScreenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={client.commentScreenshotUrl}
                    alt={`Client feedback shared by ${client.name}`}
                    loading="lazy"
                  />
                  <span>View client feedback</span>
                </a>
              )}
            </article>
          ))}
        </section>
      )}
      {state === 'ready' && clients.length === 0 && (
        <div className="empty-work">
          <span>BUILT ON COLLABORATION</span>
          <p>Client project highlights will appear here as approved stories are published.</p>
        </div>
      )}
      <section className="review-section" aria-labelledby="review-heading">
        <div>
          <span className="eyebrow">YOUR EXPERIENCE MATTERS</span>
          <h2 id="review-heading">How was working with us?</h2>
          <p>
            Add your name and social profile so we can verify your rating. Your details won’t be
            displayed publicly.
          </p>
          <div className="rating-summary">
            <span
              className="review-stars"
              aria-label={`${ratingAverage.toFixed(1)} out of 5 stars`}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={18}
                  fill={index < Math.round(ratingAverage) ? 'currentColor' : 'none'}
                />
              ))}
            </span>
            <strong>
              {ratingCount > 0 ? `${ratingAverage.toFixed(1)} / 5` : 'No ratings yet'}
            </strong>
            <small>
              {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
            </small>
          </div>
        </div>
        <form className="review-form" onSubmit={submitRating}>
          <fieldset className="rating-field">
            <legend>Your rating</legend>
            <div className="rating-options" aria-label="Choose a rating from one to five stars">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1
                return (
                  <button
                    key={value}
                    type="button"
                    className={value <= rating ? 'rating-star is-selected' : 'rating-star'}
                    aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                  >
                    <Star size={25} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                )
              })}
            </div>
          </fieldset>
          <label className="field">
            <span>
              Your name <b>*</b>
            </span>
            <input
              required
              minLength={2}
              maxLength={160}
              autoComplete="name"
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>
              Social platform <b>*</b>
            </span>
            <select
              required
              value={socialPlatform}
              onChange={(event) => {
                const value = event.target.value
                setSocialPlatform(value)
                if (value !== 'Other') setCustomSocialPlatform('')
              }}
            >
              <option value="">Choose a platform</option>
              <option>YouTube</option>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>Facebook</option>
              <option>X</option>
              <option>Other</option>
            </select>
          </label>
          {socialPlatform === 'Other' && (
            <label className="field">
              <span>
                Your social platform <b>*</b>
              </span>
              <input
                required
                minLength={1}
                maxLength={40}
                autoComplete="off"
                placeholder="Enter your social platform"
                value={customSocialPlatform}
                onChange={(event) => setCustomSocialPlatform(event.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span>
              Platform username or ID <b>*</b>
            </span>
            <input
              required
              minLength={1}
              maxLength={120}
              autoComplete="off"
              placeholder="e.g. @yourusername"
              value={socialHandle}
              onChange={(event) => setSocialHandle(event.target.value)}
            />
          </label>
          {reviewError && (
            <p className="form-error" role="alert">
              {reviewError}
            </p>
          )}
          {reviewNotice && (
            <p className="review-notice" role="status">
              {reviewNotice}
            </p>
          )}
          <button
            className="button button-accent"
            type="submit"
            disabled={
              submittingRating ||
              rating === 0 ||
              reviewerName.trim().length < 2 ||
              !socialPlatform ||
              (socialPlatform === 'Other' && !customSocialPlatform.trim()) ||
              !socialHandle.trim()
            }
          >
            {submittingRating ? 'Sending rating…' : 'Submit your rating'} <ArrowUpRight size={16} />
          </button>
        </form>
      </section>
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">YOUR PROJECT COULD BE NEXT</span>
          <h2>Let’s make something meaningful.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Start a conversation
        </Link>
      </div>
    </div>
  )
}
