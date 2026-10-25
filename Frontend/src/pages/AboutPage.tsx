import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="shell page-shell about-page">
      <div className="page-intro">
        <span className="eyebrow">ABOUT A Z STUDIOS</span>
        <h1>
          Stories with
          <br />
          <em>purpose and polish.</em>
        </h1>
        <p>
          A Z Studios is an independent creative post-production studio partnering with brands and
          creators across the United States, the Gulf countries, and other markets around the world.
        </p>
      </div>
      <div className="about-image">
        <img
          src="https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1800&q=85"
          alt="A camera setup ready for a shoot"
          loading="lazy"
        />
        <span>CREATIVE PARTNERSHIPS, WITHOUT BORDERS</span>
      </div>
      <div className="about-columns">
        <div>
          <span className="eyebrow">OUR APPROACH</span>
          <h2>
            A global studio.
            <br />
            One clear purpose.
          </h2>
        </div>
        <div>
          <p>
            We provide video editing, short-form content, YouTube and podcast production, motion
            graphics, color grading, sound finishing, and brand and commercial video services.
          </p>
          <p>
            Our team currently works with clients in the USA, Gulf countries, and other regions,
            bringing clear communication and a consistent creative process to every collaboration.
          </p>
          <p>
            We listen first, shape the edit around your audience, and refine each detail together.
            You stay informed from the first brief through final delivery.
          </p>
        </div>
      </div>
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">LET’S CREATE SOMETHING</span>
          <h2>Let’s give your story its best cut.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Get in touch <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
