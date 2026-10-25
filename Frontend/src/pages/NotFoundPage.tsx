import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="shell page-shell not-found">
      <span className="eyebrow">404 / OUT OF FRAME</span>
      <h1>
        This page didn’t
        <br />
        <em>make the cut.</em>
      </h1>
      <Link className="text-link" to="/">
        Back to the beginning
      </Link>
    </div>
  )
}
