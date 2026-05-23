// Minimal side-effects list. Bullet points, mild=muted, severe=accent.
const TITLES = {
  hy: 'Կողմնակի ազդեցություններ',
  ru: 'Побочные эффекты',
  en: 'Side effects',
}

function normalize(item) {
  if (typeof item === 'string') return { effect: item, severity: 'mild' }
  if (item && typeof item === 'object') {
    const effect = String(item.effect ?? '').trim()
    let severity = item.severity
    if (!['mild', 'moderate', 'severe'].includes(severity)) severity = 'mild'
    return { effect, severity }
  }
  return { effect: '', severity: 'mild' }
}

export default function SideEffects({ effects, language }) {
  if (!effects || effects.length === 0) return null
  const items = effects.map(normalize).filter(e => e.effect)
  if (items.length === 0) return null

  return (
    <div className="card-min">
      <p
        className="font-mono text-warm-muted uppercase tracking-wider mb-3"
        style={{ fontSize: 11 }}
      >
        {TITLES[language] || TITLES.en}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="font-plex"
            style={{
              fontSize: 14,
              color: item.severity === 'severe' ? '#8B1A1A' : '#6B6860',
              fontWeight: item.severity === 'severe' ? 500 : 400,
            }}
          >
            · {item.effect}
          </li>
        ))}
      </ul>
    </div>
  )
}
