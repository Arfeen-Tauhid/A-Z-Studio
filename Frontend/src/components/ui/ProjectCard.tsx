import { ArrowUpRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Project } from '../../lib/api'
import { preloadRoute } from '../../lib/routePreload'
import { youtubeThumbnailUrl } from '../../lib/youtube'

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const thumbnailUrl =
    project.thumbnailUrl ?? (project.videoUrl && youtubeThumbnailUrl(project.videoUrl))

  return (
    <article className={`project-card project-card-${index % 3}`}>
      <Link
        className="project-image-link"
        to={`/work/${project.slug}`}
        aria-label={`View ${project.title}`}
        onPointerEnter={() => preloadRoute(`/work/${project.slug}`)}
        onFocus={() => preloadRoute(`/work/${project.slug}`)}
      >
        {thumbnailUrl ? (
          <img className="project-image" src={thumbnailUrl} alt="" loading="lazy" />
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
            <Link
              to={`/work/${project.slug}`}
              onPointerEnter={() => preloadRoute(`/work/${project.slug}`)}
              onFocus={() => preloadRoute(`/work/${project.slug}`)}
            >
              {project.title}
            </Link>
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
