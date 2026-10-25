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
        <span className="eyebrow">SERVICES</span>
        <h1>
          One studio.
          <br />
          <em>Many ways to tell it.</em>
        </h1>
        <p>
          Video editing, social content, podcasts, motion design, and finishing—carefully tailored
          to your audience, platform, and project goals.
        </p>
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
        <div className="services-page-grid">
          {services.map((service, index) => (
            <article className="service-detail" key={service._id}>
              <span className="eyebrow">0{index + 1} / POST-PRODUCTION</span>
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
      )}
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">LOOKING FOR THE RIGHT CREATIVE PARTNER?</span>
          <h2>Let’s plan the right approach.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Start a conversation <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
