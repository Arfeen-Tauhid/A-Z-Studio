import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, type StudioService } from '../lib/api'

export function ServicesPage() {
  const [services, setServices] = useState<StudioService[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    apiRequest<StudioService[]>('/api/public/services')
      .then((result) => {
        setServices(result)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  return (
    <div className="shell page-shell">
      <div className="page-intro">
        <span className="eyebrow">POST-PRODUCTION, BUILT AROUND YOUR STORY</span>
        <h1>
          From raw footage
          <br />
          <em>to work that moves.</em>
        </h1>
        <p>
          Thoughtful editing and finishing for brands, creators, and teams. Start with the service
          that fits your project; we’ll shape the details together.
        </p>
      </div>
      <div className="service-principles" aria-label="Our service principles">
        <article className="service-principle">
          <span>01 / FORMAT</span>
          <h2>Made for where it plays.</h2>
          <p>Every cut is shaped for its audience, platform, and screen.</p>
        </article>
        <article className="service-principle">
          <span>02 / STORY</span>
          <h2>Built around what matters.</h2>
          <p>We find the focus in your footage and keep the message clear.</p>
        </article>
        <article className="service-principle">
          <span>03 / FINISH</span>
          <h2>Polished, not overworked.</h2>
          <p>Careful sound, color, pacing, and graphics bring it together.</p>
        </article>
      </div>
      {state === 'loading' && <p className="muted-copy">Loading available services…</p>}
      {state === 'error' && (
        <p className="inline-error">
          Services are temporarily unavailable. Please try again shortly.
        </p>
      )}
      {state === 'ready' && services.length === 0 && (
        <div className="empty-work">
          <span>BUILT AROUND YOUR PROJECT</span>
          <p>
            We tailor our editing support to your footage and goals. Get in touch and we’ll find the
            right approach together.
          </p>
        </div>
      )}
      {state === 'ready' && services.length > 0 && (
        <>
          <div className="services-list-heading">
            <span className="eyebrow">WHAT WE CAN MAKE TOGETHER</span>
            <p>Explore the work. We’ll tailor the scope to your goals.</p>
          </div>
          <div className="services-page-grid">
            {services.map((service, index) => (
              <article className="service-detail" key={service._id}>
                <span className="eyebrow">
                  {String(index + 1).padStart(2, '0')} / CREATIVE SERVICE
                </span>
                <h2>{service.title}</h2>
                <p>{service.description}</p>
                <ul>
                  {service.deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">HAVE A PROJECT IN MIND?</span>
          <h2>Tell us what you’re making.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Start a conversation <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
