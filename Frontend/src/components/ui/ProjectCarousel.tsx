import type { Project } from '../../lib/api'
import { type ProjectAspectRatio } from '../../lib/projectMedia'
import { AutoScrollRow } from './AutoScrollRow'
import { ProjectCard } from './ProjectCard'

export function ProjectCarousel({
  projects,
  ratio,
  label,
}: {
  projects: Project[]
  ratio: ProjectAspectRatio
  label: string
}) {
  const ratioClass = ratio.replace(':', '-')

  return (
    <AutoScrollRow
      items={projects}
      label={label}
      className={`work-project-grid work-project-grid-${ratioClass}`}
      itemClassName="auto-scroll-item project-carousel-item"
      renderItem={(project, index) => (
        <ProjectCard project={project} index={index} portfolioFrame />
      )}
    />
  )
}
