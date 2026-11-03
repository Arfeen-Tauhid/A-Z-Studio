import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const process = [
  [
    '01',
    'THE BRIEF',
    'Start with the story.',
    'Tell us what you’re making, who it’s for, where it will live, and what you already have. A rough idea is enough to start.',
  ],
  [
    '02',
    'THE PLAN',
    'Set a clear direction.',
    'Together we define the creative approach, deliverables, timing, and scope—so expectations are clear before editing begins.',
  ],
  [
    '03',
    'THE EDIT',
    'Find the strongest cut.',
    'We shape the footage into a focused story, balancing pacing, picture, sound, and graphics around the agreed direction.',
  ],
  [
    '04',
    'THE REVIEW',
    'Refine it together.',
    'You review the edit and share consolidated feedback. We work through the agreed revisions and keep you updated as it comes together.',
  ],
  [
    '05',
    'THE HANDOFF',
    'Ready for its next screen.',
    'Once approved, we prepare final exports in the formats and aspect ratios we agreed on, ready for your channels.',
  ],
]

export function ProcessPage() {
  return (
    <div className="shell page-shell process-page">
      <div className="page-intro">
        <span className="eyebrow">A CLEAR, COLLABORATIVE WORKFLOW</span>
        <h1>
          From first brief
          <br />
          <em>to final delivery.</em>
        </h1>
        <p>
          No guesswork, no disappearing act. Just a shared plan, considered creative work, and
          feedback at the right moments.
        </p>
      </div>
      <div className="process-edit-timeline" aria-hidden="true">
        <div className="process-edit-heading">
          <span>PROJECT TIMELINE</span>
          <span>5 SEQUENCES · ONE CLEAR STORY</span>
        </div>
        <div className="process-edit-ruler">
          <span>BRIEF</span>
          <span>PLAN</span>
          <span>EDIT</span>
          <span>REVIEW</span>
          <span>DELIVERY</span>
        </div>
        <div className="process-edit-tracks">
          <span>V1</span>
          <div>
            {process.map(([number], index) => (
              <i className={`process-edit-clip process-edit-clip-${index + 1}`} key={number} />
            ))}
          </div>
          <span>A1</span>
          <div className="process-edit-wave">
            {Array.from({ length: 28 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <span className="process-edit-playhead" />
        </div>
      </div>
      <div className="process-list">
        {process.map(([number, stage, title, copy]) => (
          <article key={number} className="process-list-item">
            <span className="process-list-number">{number}</span>
            <div className="process-list-title">
              <span className="eyebrow">{stage}</span>
              <h2>{title}</h2>
            </div>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <p className="process-note">
        <span className="eyebrow">ALWAYS IN THE LOOP</span>
        Your project scope, delivery dates, and revision rounds are agreed together before work
        begins.
      </p>
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">HAVE A PROJECT IN MIND?</span>
          <h2>Let’s talk through your first cut.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Start a project <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
