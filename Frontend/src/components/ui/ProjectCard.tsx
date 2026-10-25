import { ArrowUpRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Project } from '../../lib/api'

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  return (
    <article className={`project-card project-card-${index % 3}`}>
      <Link
        className="project-image-link"
        to={`/work/${project.slug}`}
        aria-label={`View ${project.title}`}
      >
        {project.thumbnailUrl ? (
          <img className="project-image" src={project.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div className="project-image project-placeholder" aria-hidden="true">
            <span className="placeholder-grain" />
            <span className="placeholder-play">
              <Play size={20} fill="currentColor" />
            </span>
          </div>
        )}
        <span className="project-open">
          <ArrowUpRight size={17} />
        </span>
      </Link>
      <div className="project-info">
        <div>
          <h3>
            <Link to={`/work/${project.slug}`}>{project.title}</Link>
          </h3>
          <p>
            {project.clientName ? `${project.clientName} · ` : ''}
            {project.category}
          </p>
        </div>
        <span className="project-number">0{index + 1}</span>
      </div>
    </article>
  )
}
