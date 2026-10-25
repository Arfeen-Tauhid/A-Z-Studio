import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const process = [
  [
    '01',
    'Share your project',
    'Tell us about your audience, goals, platforms, timeline, and the footage or materials you already have.',
  ],
  [
    '02',
    'Plan the right approach',
    'We align on creative direction, deliverables, timing, project scope, and pricing before production begins.',
  ],
  [
    '03',
    'Shape the story',
    'We turn your source material into a focused edit, with the right pacing, graphics, and finishing.',
  ],
  [
    '04',
    'Review and refine',
    'You review the edit, share feedback, and we make the agreed revisions together.',
  ],
  [
    '05',
    'Final delivery',
    'Approved exports are prepared in the formats and aspect ratios we agreed on, ready for your channels.',
  ],
]

export function ProcessPage() {
  return (
    <div className="shell page-shell">
      <div className="page-intro">
        <span className="eyebrow">THE PROCESS</span>
        <h1>
          Clear from
          <br />
          <em>first cut to final.</em>
        </h1>
        <p>Good collaboration is part of the craft. Here’s what to expect when we work together.</p>
      </div>
      <div className="process-list">
        {process.map(([number, title, copy]) => (
          <article key={number} className="process-list-item">
            <span className="process-list-number">{number}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <div className="page-bottom-cta">
        <div>
          <span className="eyebrow">READY WHEN YOU ARE</span>
          <h2>Let’s start with a conversation.</h2>
        </div>
        <Link className="button button-accent" to="/contact">
          Start a project <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
