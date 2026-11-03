import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export function AutoScrollRow<T>({
  items,
  renderItem,
  label,
  className,
  itemClassName,
  onItemVisible,
}: {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  label: string
  className: string
  itemClassName: string
  onItemVisible?: (item: T, index: number) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const segmentRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef(items)
  const onItemVisibleRef = useRef(onItemVisible)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [duration, setDuration] = useState(36)
  const isAutoScrolling = isOverflowing && !prefersReducedMotion

  useEffect(() => {
    itemsRef.current = items
    onItemVisibleRef.current = onItemVisible
  }, [items, onItemVisible])

  useEffect(() => {
    const viewport = viewportRef.current
    const segment = segmentRef.current
    if (!viewport || !segment) return

    const updateOverflow = () => {
      const segmentWidth = segment.scrollWidth
      setIsOverflowing(segmentWidth > viewport.clientWidth + 1)
      setDuration(Math.max(10, Math.min(60, segmentWidth / 100)))
    }

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches)
    updateMotionPreference()

    const observer = new ResizeObserver(updateOverflow)
    observer.observe(viewport)
    observer.observe(segment)
    motionPreference.addEventListener('change', updateMotionPreference)
    updateOverflow()

    return () => {
      observer.disconnect()
      motionPreference.removeEventListener('change', updateMotionPreference)
    }
  }, [items.length])

  useEffect(() => {
    const viewport = viewportRef.current
    const segment = segmentRef.current
    if (!viewport || !segment || !onItemVisibleRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return
          const index = Number((entry.target as HTMLElement).dataset.itemIndex)
          const item = itemsRef.current[index]
          if (item !== undefined) onItemVisibleRef.current?.(item, index)
          observer.unobserve(entry.target)
        })
      },
      { root: viewport, threshold: 0.5 },
    )

    Array.from(segment.children).forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [items])

  const renderItems = (duplicate: boolean) =>
    items.map((item, index) => (
      <div
        className={itemClassName}
        data-item-index={index}
        key={`${duplicate ? 'duplicate-' : ''}${index}`}
      >
        {renderItem(item, index)}
      </div>
    ))

  return (
    <div className={`auto-scroll-row ${className}`}>
      <div
        ref={viewportRef}
        className="auto-scroll-viewport"
        role="region"
        aria-label={label}
        tabIndex={isOverflowing ? 0 : undefined}
      >
        <div
          className={`auto-scroll-track${isAutoScrolling ? ' is-auto-scrolling' : ''}`}
          style={{ '--auto-scroll-duration': `${duration}s` } as CSSProperties}
        >
          <div className="auto-scroll-segment" ref={segmentRef}>
            {renderItems(false)}
          </div>
          {isAutoScrolling && (
            <div className="auto-scroll-segment" aria-hidden="true" inert>
              {renderItems(true)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
