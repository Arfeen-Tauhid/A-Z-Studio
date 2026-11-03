import { ArrowUpRight, Star } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AutoScrollRow } from '../components/ui/AutoScrollRow'
import { VideoPlayer } from '../components/ui/VideoPlayer'
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

type Testimonial = {
  _id: string
  clientName: string
  clientCountry: string
  clientChannelName: string
  quote: string
  commentScreenshotUrl: string
  rating: number
}

type RecentRating = {
  _id: string
  rating: number
  name: string
  socialPlatform: string
  feedback?: string
  createdAt: string
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [testimonialState, setTestimonialState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ratingAverage, setRatingAverage] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [recentRatings, setRecentRatings] = useState<RecentRating[]>([])
  const [rating, setRating] = useState(0)
  const [reviewerName, setReviewerName] = useState('')
  const [socialPlatform, setSocialPlatform] = useState('')
  const [customSocialPlatform, setCustomSocialPlatform] = useState('')
  const [socialHandle, setSocialHandle] = useState('')
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    apiRequest<Testimonial[]>('/api/public/testimonials')
      .then((items) => {
        setTestimonials(items)
        setTestimonialState('ready')
      })
      .catch(() => setTestimonialState('error'))
  }, [])

  useEffect(() => {
    Promise.all([
      apiRequest<Client[]>('/api/public/clients'),
      apiRequest<{ average: number; count: number; recent: RecentRating[] }>('/api/public/ratings'),
    ])
      .then(([clientItems, ratingSummary]) => {
        setClients(clientItems)
        setRatingAverage(ratingSummary.average)
        setRatingCount(ratingSummary.count)
        setRecentRatings(ratingSummary.recent)
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
      const result = await apiRequest<{
        average: number
        count: number
        recent: RecentRating[]
        message: string
      }>('/api/public/ratings', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          name: reviewerName,
          socialPlatform: socialPlatform === 'Other' ? customSocialPlatform.trim() : socialPlatform,
          socialHandle,
          feedback: ratingFeedback,
        }),
      })
      setRatingAverage(result.average)
      setRatingCount(result.count)
      setRecentRatings(result.recent)
      setReviewNotice(result.message)
      setRating(0)
      setReviewerName('')
      setSocialPlatform('')
      setCustomSocialPlatform('')
      setSocialHandle('')
      setRatingFeedback('')
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
        <AutoScrollRow
          items={clients}
          label="Client showcases"
          className="client-grid auto-scroll-client-grid"
          itemClassName="auto-scroll-item client-carousel-item"
          renderItem={(client, index) => {
            const isDemo = client.name.startsWith('DEMO ONLY')
            return (
              <article className="client-card" key={client._id}>
                {isDemo && <span className="demo-content-label">DEMO ONLY · SAMPLE ENTRY</span>}
                <h2>{client.name}</h2>
                {client.socialHandle && !isDemo && (
                  <p className="client-social">
                    {client.socialPlatform ? `${client.socialPlatform} · ` : ''}
                    {client.socialHandle}
                  </p>
                )}
                {client.videoUrl && (
                  <VideoPlayer
                    className="client-video"
                    source={client.videoUrl}
                    title={`${client.name} video`}
                    poster={client.videoThumbnailUrl}
                  />
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
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    <span>View client feedback</span>
                  </a>
                )}
              </article>
            )
          }}
        />
      )}
      {state === 'ready' && clients.length === 0 && (
        <div className="empty-work">
          <span>BUILT ON COLLABORATION</span>
          <p>Client project highlights will appear here as approved stories are published.</p>
        </div>
      )}
      {testimonialState === 'error' && (
        <p className="inline-error">Client testimonials are temporarily unavailable.</p>
      )}
      {testimonialState === 'ready' && testimonials.length > 0 && (
        <section className="testimonial-section" aria-labelledby="testimonials-heading">
          <span className="eyebrow">KIND WORDS</span>
          <h2 id="testimonials-heading">Client testimonials</h2>
          <AutoScrollRow
            items={testimonials}
            label="Client testimonials"
            className="testimonial-grid auto-scroll-testimonial-grid"
            itemClassName="auto-scroll-item testimonial-carousel-item"
            renderItem={(testimonial, index) => {
              const isDemo = testimonial.clientName.startsWith('DEMO ONLY')
              return (
                <article className="testimonial-card" key={testimonial._id}>
                  {isDemo && (
                    <span className="demo-content-label">DEMO ONLY · NOT REAL FEEDBACK</span>
                  )}
                  <div
                    className="testimonial-rating"
                    aria-label={`${testimonial.rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={15}
                        fill={index < testimonial.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <blockquote>{testimonial.quote}</blockquote>
                  {!isDemo && (
                    <figure className="testimonial-feedback">
                      <img
                        src={testimonial.commentScreenshotUrl}
                        alt={`Feedback comment from ${testimonial.clientName}`}
                        loading={index < 2 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </figure>
                  )}
                  <p className="testimonial-attribution">
                    <strong>{testimonial.clientName}</strong>
                    <span>
                      {testimonial.clientChannelName} · {testimonial.clientCountry}
                    </span>
                  </p>
                </article>
              )
            }}
          />
        </section>
      )}
      <section className="review-section" aria-labelledby="review-heading">
        <div>
          <span className="eyebrow">YOUR EXPERIENCE MATTERS</span>
          <h2 id="review-heading">How was working with us?</h2>
          <p>
            Share your name, social platform, rating, and optional feedback. Your name, platform,
            rating, and feedback will appear publicly; your platform username stays private.
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
          {recentRatings.length > 0 && (
            <section className="recent-ratings" aria-labelledby="recent-ratings-heading">
              <h3 id="recent-ratings-heading">5 most recent ratings</h3>
              <div className="recent-rating-list">
                {recentRatings.map((item) => (
                  <article className="recent-rating-card" key={item._id}>
                    <div className="recent-rating-heading">
                      <strong>{item.name}</strong>
                      <span>{item.socialPlatform}</span>
                    </div>
                    <div
                      className="recent-rating-stars"
                      aria-label={`${item.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={13}
                          fill={index < item.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    {item.feedback && <p>{item.feedback}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
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
            <span>Feedback (optional)</span>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Share a few words about your experience"
              value={ratingFeedback}
              onChange={(event) => setRatingFeedback(event.target.value)}
            />
            <small>Your feedback will be shown publicly alongside your rating.</small>
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
