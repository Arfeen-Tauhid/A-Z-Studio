export function SectionHeading({
  label,
  title,
  copy,
}: {
  label: string
  title: string
  copy?: string
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{label}</span>
      <h2 aria-label={title.replace(/\s+/g, ' ').trim()}>
        {title.split('\n').map((line, index) => (
          <span key={`${line}-${index}`} aria-hidden="true">
            {index > 0 && <br />}
            {line.split(/(\s+)/).map((part, wordIndex) =>
              /^\s+$/.test(part) ? (
                part
              ) : (
                <span
                  className="section-heading-word"
                  data-direction={Math.floor(wordIndex / 2) % 2 === 0 ? 'down' : 'up'}
                  key={`${wordIndex}-${part}`}
                  style={{ animationDelay: `${Math.floor(wordIndex / 2) * 65}ms` }}
                >
                  {part}
                </span>
              ),
            )}
          </span>
        ))}
      </h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}
