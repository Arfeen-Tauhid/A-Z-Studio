import { ArrowUpRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PricingPage() {
  return (
    <div className="shell page-shell pricing-page">
      <div className="page-intro">
        <span className="eyebrow">PRICING</span>
        <h1>
          Clear scope.
          <br />
          Thoughtful pricing.
        </h1>
        <p>
          We tailor each proposal to your footage, deliverables, timeline, and creative goals, then
          agree the scope with you before work begins.
        </p>
      </div>
      <div className="quote-panel">
        <div>
          <span className="eyebrow">A CLEAR, CUSTOM QUOTE</span>
          <h2>
            Scope first.
            <br />
            No surprises.
          </h2>
          <p>
            We’ll talk through your footage, goals, and timeline so you know what’s included before
            the first cut.
          </p>
          <Link className="button button-accent" to="/contact">
            Request a quote <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="quote-details">
          <span className="eyebrow">WHAT SHAPES YOUR QUOTE</span>
          {[
            'Footage length and condition',
            'Editing complexity and style',
            'Number and format of deliverables',
            'Timeline and turnaround',
            'Agreed review and revision scope',
          ].map((item) => (
            <p key={item}>
              <Check size={15} /> {item}
            </p>
          ))}
        </div>
      </div>
      <p className="pricing-note">
        We don’t publish fixed packages because the right scope depends on your actual project. Tell
        us what you have in mind and we’ll get back to you with next steps.
      </p>
    </div>
  )
}
