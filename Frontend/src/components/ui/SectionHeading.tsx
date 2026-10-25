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
      <h2>
        {title.split('\n').map((line, index) => (
          <span key={`${line}-${index}`}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}
