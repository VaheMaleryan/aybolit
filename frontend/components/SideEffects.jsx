const TITLES = {
  hy: 'Կողմնակի ազդեցություններ',
  ru: 'Побочные эффекты',
  en: 'Side Effects',
}

const LEGEND = {
  hy: { mild: 'Թեթև', moderate: 'Միջին', severe: 'Ծանր' },
  ru: { mild: 'Лёгкие', moderate: 'Умеренные', severe: 'Серьёзные' },
  en: { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' },
}

const PILL_CLASSES = {
  mild: 'bg-gray-100 text-gray-700',
  moderate: 'bg-amber-100 text-amber-800',
  severe: 'bg-red-100 text-red-800',
}

// Keyword fallback for legacy string-only effects
function inferSeverity(text) {
  const t = text.toLowerCase()
  const severe = ['severe','serious','death','fatal','liver','kidney','heart','allergic','anaphyla','bleeding','seizure','ծանր','серьёз','серьез','опасн']
  const moderate = ['nausea','vomiting','dizziness','headache','rash','pain','diarrhea','constipation','insomnia','rash','міжин','умерен','տհաճ']
  if (severe.some(k => t.includes(k))) return 'severe'
  if (moderate.some(k => t.includes(k))) return 'moderate'
  return 'mild'
}

function normalize(item) {
  // Accept {effect, severity} objects (new) or plain strings (legacy)
  if (typeof item === 'string') {
    return { effect: item, severity: inferSeverity(item) }
  }
  if (item && typeof item === 'object') {
    const effect = String(item.effect ?? '').trim()
    let severity = item.severity
    if (!['mild','moderate','severe'].includes(severity)) {
      severity = effect ? inferSeverity(effect) : 'mild'
    }
    return { effect, severity }
  }
  return { effect: '', severity: 'mild' }
}

export default function SideEffects({ effects, language }) {
  if (!effects || effects.length === 0) return null

  const legend = LEGEND[language] || LEGEND.en
  const items = effects.map(normalize).filter(e => e.effect)

  if (items.length === 0) return null

  return (
    <div className="card">
      <h3 className="font-playfair text-xl font-semibold text-warm-text mb-4">
        {TITLES[language] || TITLES.en}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-plex font-medium ${PILL_CLASSES[item.severity]}`}
            title={item.severity}
          >
            {item.effect}
          </span>
        ))}
      </div>
      <div className="flex gap-4 mt-4 pt-4 border-t border-warm-border">
        <span className="flex items-center gap-1.5 text-xs font-plex text-warm-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> {legend.mild}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-plex text-warm-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> {legend.moderate}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-plex text-warm-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> {legend.severe}
        </span>
      </div>
    </div>
  )
}
