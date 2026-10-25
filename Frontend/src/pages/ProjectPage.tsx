import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectCard } from '../components/ui/ProjectCard'
import { apiRequest, type PageResult, type Project } from '../lib/api'

export function ProjectPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([])
  const [relatedState, setRelatedState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!slug) return
    apiRequest<Project>(`/api/public/projects/${encodeURIComponent(slug)}`)
      .then((result) => {
        setProject(result)
        setState('ready')
        const query = new URLSearchParams({ category: result.category, limit: '4' })
        apiRequest<PageResult<Project>>(`/api/public/projects?${query}`)
          .then((page) => {
            setRelatedProjects(page.items.filter((item) => item.slug !== result.slug).slice(0, 3))
            setRelatedState('ready')
          })
          .catch(() => setRelatedState('error'))
      })
      .catch(() => setState('error'))
  }, [slug])

  if (state === 'loading')
    return (
      <div className="shell page-shell">
        <p className="eyebrow">LOADING PROJECT</p>
      </div>
    )
  if (state === 'error' || !project)
    return (
      <div className="shell page-shell">
        <span className="eyebrow">PROJECT NOT FOUND</span>
        <h1>
          This story isn’t
          <br />
          <em>in this cut.</em>
        </h1>
        <Link className="text-link" to="/work">
          <ArrowLeft size={16} /> Back to the work
        </Link>
      </div>
    )

  return (
    <div className="shell project-detail">
      <Link className="back-link" to="/work">
        <ArrowLeft size={15} /> All work
      </Link>
      <span className="eyebrow">
        {project.category}
        {project.clientName ? ` / ${project.clientName}` : ''}
      </span>
      <h1>{project.title}</h1>
      {project.videoUrl ? (
        <video
          className="detail-video"
          controls
          playsInline
          poster={project.thumbnailUrl}
          preload="none"
        >
          <source src={project.videoUrl} />
          Your browser does not support video playback.
        </video>
      ) : project.thumbnailUrl ? (
        <img
          className="detail-poster"
          src={project.thumbnailUrl}
          alt={`${project.title} project still`}
        />
      ) : (
        <div
          className="detail-poster detail-poster-empty"
          aria-label="Project preview unavailable"
        />
      )}
      <div className="project-story">
        <div>
          <span className="eyebrow">THE PROJECT</span>
          <p>{project.description}</p>
        </div>
        <div className="project-story-aside">
          {project.brief && (
            <>
              <span className="eyebrow">THE BRIEF</span>
              <p>{project.brief}</p>
            </>
          )}
          {project.approach && (
            <>
              <span className="eyebrow">THE APPROACH</span>
              <p>{project.approach}</p>
            </>
          )}
        </div>
      </div>
      {project.deliverables && project.deliverables.length > 0 && (
        <div className="detail-deliverables">
          <span className="eyebrow">DELIVERABLES</span>
          <ul>
            {project.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {relatedState === 'ready' && relatedProjects.length > 0 && (
        <section className="related-projects">
          <span className="eyebrow">MORE STORIES</span>
          <h2>Related work</h2>
          <div className="project-grid">
            {relatedProjects.map((item, index) => (
              <ProjectCard key={item._id} project={item} index={index} />
            ))}
          </div>
        </section>
      )}
      {relatedState === 'error' && (
        <p className="inline-error">Related projects are temporarily unavailable.</p>
      )}
      <div className="detail-cta">
        <h2>Have a story like this?</h2>
        <Link className="button button-accent" to="/contact">
          Let’s talk <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
