import { ArrowUpRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Project } from '../../lib/api'
import {
  isPlayableProjectVideo,
  projectAspectRatio,
  socialPlatformName,
} from '../../lib/projectMedia'
import { preloadRoute } from '../../lib/routePreload'
import { youtubeThumbnailUrl } from '../../lib/youtube'

export function ProjectCard({
  project,
  index = 0,
  portfolioFrame = false,
}: {
  project: Project
  index?: number
  portfolioFrame?: boolean
}) {
  const aspectRatio = projectAspectRatio(project)
  const aspectRatioClass = aspectRatio.replace(':', '-')
  const thumbnailUrl =
    project.thumbnailUrl ?? (project.videoUrl && youtubeThumbnailUrl(project.videoUrl))
  const isPlayableVideo = project.videoUrl ? isPlayableProjectVideo(project.videoUrl) : false

  return (
    <article
      className={`project-card project-card-${index % 3} project-card-ratio-${aspectRatioClass}${portfolioFrame ? ' project-card-portfolio-frame' : ''}`}
    >
      <Link
        className="project-image-link"
        to={`/work/${project.slug}`}
        aria-label={`${isPlayableVideo ? 'Watch video' : project.videoUrl ? `View on ${socialPlatformName(project.videoUrl)}` : 'View project'}: ${project.title}`}
        onPointerEnter={() => preloadRoute(`/work/${project.slug}`)}
        onFocus={() => preloadRoute(`/work/${project.slug}`)}
      >
        {thumbnailUrl ? (
          <img
            className="project-image"
            src={thumbnailUrl}
            alt=""
            loading={portfolioFrame && index < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <div className="project-image project-placeholder" aria-hidden="true">
            <span className="placeholder-grain" />
            <span className="placeholder-play">
              <Play size={20} fill="currentColor" />
            </span>
          </div>
        )}
        <span className="project-frame-label" aria-hidden="true">
          AZ / FRAME {String(index + 1).padStart(2, '0')}
        </span>
        {project.videoUrl && (
          <span className="project-watch" aria-hidden="true">
            <span className="project-watch-icon">
              {isPlayableVideo ? (
                <Play size={19} fill="currentColor" />
              ) : (
                <ArrowUpRight size={17} />
              )}
            </span>
            <span>
              {isPlayableVideo ? 'Watch Video' : `View on ${socialPlatformName(project.videoUrl)}`}
            </span>
          </span>
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
