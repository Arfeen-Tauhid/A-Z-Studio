import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="shell page-shell about-page">
      <div className="about-intro-layout">
        <div className="page-intro">
          <span className="eyebrow">ABOUT A Z STUDIOS</span>
          <h1>
            Good stories
            <br />
            <em>deserve a great cut.</em>
          </h1>
          <p>
            We’re an independent post-production studio helping brands and creators turn raw footage
            into clear, considered video stories.
          </p>
        </div>
        <aside className="about-edit-card" aria-label="A Z Studios post-production approach">
          <div className="about-edit-card-topline">
            <span>AZ / POST-PRODUCTION</span>
            <span>01—03</span>
          </div>
          <div className="about-edit-frame" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>
          <div className="about-edit-card-title">
            <span>THE STORY IS IN THE DETAILS</span>
            <span>4K</span>
          </div>
          <div className="about-edit-wave" aria-hidden="true">
            {Array.from({ length: 23 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <div className="about-edit-card-bottom">
            <span>STORY</span>
            <i />
            <span>EDIT</span>
            <i />
            <span>FINISH</span>
          </div>
        </aside>
      </div>
      <div className="about-image">
        <img
          src="https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1800&q=85"
          alt="A camera setup ready for a shoot"
          loading="lazy"
        />
        <div className="about-image-caption">
          <span className="eyebrow">A Z STUDIOS / POST-PRODUCTION</span>
          <strong>Make every frame earn its place.</strong>
        </div>
        <div className="about-image-timecode" aria-hidden="true">
          <span>FRAME 001 / 024</span>
          <span>PICTURE LOCK · SOUND · FINISH</span>
        </div>
      </div>
      <div className="about-columns">
        <div>
          <span className="eyebrow">WHY WE DO THE WORK</span>
          <h2>
            The edit is where
            <br />
            the story finds focus.
          </h2>
        </div>
        <div>
          <p>
            A strong edit does more than arrange clips. It creates momentum, brings the important
            details forward, and gives every moment a reason to be there.
          </p>
          <p>
            We partner with clients across the United States, Gulf countries, and other markets.
            Wherever we work from, clear communication and a shared creative direction keep the
            collaboration grounded.
          </p>
          <p>
            From short-form content and podcasts to brand films and finishing, we listen first,
            shape the approach around your audience, and refine the details together.
          </p>
        </div>
      </div>
      <div className="about-values about-edit-values" aria-label="What you can expect from A Z Studios">
        <article>
          <span>01 / CLARITY</span>
          <h3>A considered plan.</h3>
          <p>Shared goals and clear next steps before the edit gets underway.</p>
        </article>
        <article>
          <span>02 / CRAFT</span>
          <h3>Care in every cut.</h3>
          <p>Thoughtful pacing and details shaped to support the story.</p>
        </article>
        <article>
          <span>03 / PARTNERSHIP</span>
          <h3>Good work, together.</h3>
          <p>Open feedback and collaboration from first brief to final files.</p>
        </article>
      </div>
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">YOUR STORY STARTS HERE</span>
          <h2>Let’s find the right way to tell it.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Get in touch <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
