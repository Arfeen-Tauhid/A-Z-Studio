import { useEffect, useState } from 'react'
import { ProjectCarousel } from '../components/ui/ProjectCarousel'
import { apiRequest, type PageResult, type Project } from '../lib/api'
import { projectAspectRatio, projectAspectRatios } from '../lib/projectMedia'

const categories = [
  'All work',
  'Short-form',
  'YouTube',
  'Podcast',
  'Commercial',
  'Motion graphics',
  'Brand & promo',
]

export function WorkPage() {
  const [category, setCategory] = useState('All work')
  const [projects, setProjects] = useState<Project[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const query = new URLSearchParams({ page: String(page), limit: '50' })
    if (category !== 'All work') query.set('category', category)
    apiRequest<PageResult<Project>>(`/api/public/projects?${query}`)
      .then((result) => {
        setProjects(result.items)
        setPages(result.pages)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [category, page])

  function selectCategory(value: string) {
    setCategory(value)
    setPage(1)
    setState('loading')
  }

  function selectPage(value: number) {
    setPage(value)
    setState('loading')
  }

  const groupedProjects = projectAspectRatios
    .map((ratio) => ({
      ratio,
      projects: projects.filter((project) => projectAspectRatio(project) === ratio),
    }))
    .filter((group) => group.projects.length > 0)

  return (
    <div className="shell page-shell">
      <div className="page-intro">
        <span className="eyebrow">THE PORTFOLIO</span>
        <h1>
          Stories worth
          <br />
          <em>staying for.</em>
        </h1>
        <p>Explore selected projects across social video, podcasts, branded content, and more.</p>
      </div>
      <div className="filter-list" aria-label="Filter projects by category">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? 'filter-chip is-active' : 'filter-chip'}
            onClick={() => selectCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {state === 'loading' && (
        <div className="project-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div className="project-skeleton" key={item} />
          ))}
        </div>
      )}
      {state === 'error' && (
        <p className="inline-error">We couldn’t load the portfolio. Please try again shortly.</p>
      )}
      {state === 'ready' &&
        groupedProjects.map(({ ratio, projects: ratioProjects }) => (
          <section className="work-ratio-section" key={ratio}>
            <div className="work-project-row">
              <ProjectCarousel
                projects={ratioProjects}
                ratio={ratio}
                label={`${ratio} project videos`}
              />
            </div>
          </section>
        ))}
      {state === 'ready' && projects.length === 0 && (
        <div className="empty-work">
          <span>NEW WORK IS ON THE WAY</span>
          <p>
            There are no published projects in this category yet. If you’re looking for something
            specific, we’d love to hear about it.
          </p>
        </div>
      )}
      {state === 'ready' && pages > 1 && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => selectPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => selectPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
