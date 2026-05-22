const TITLES = {
  hy: 'Կողмnakи ǝndings',
  ru: 'Побочные эффекты',
  en: 'Side Effects',
}

function classifyEffect(effect) {
  const text = effect.toLowerCase()
  const severe = ['severe', 'serious', 'death', 'fatal', 'liver', 'kidney', 'heart', 'allergic', 'anaphyla', 'bleeding', 'seizure']
  const moderate = ['nausea', 'vomiting', 'dizziness', 'headache', 'rash', 'pain', 'diarrhea', 'constipation', 'insomnia']
  if (severe.some(k => text.includes(k))) return 'severe'
  if (moderate.some(k => text.includes(k))) return 'moderate'
  return 'mild'
}

const PILL_CLASSES = {
  mild: 'bg-gray-100 text-gray-700',
  moderate: 'bg-amber-100 text-amber-800',
  severe: 'bg-red-100 text-red-800',
}

export default function SideEffects({ effects, language }) {
  if (!effects || effects.length === 0) return null

  return (
    <div className="card">
      <h3 className="font-playfair text-xl font-semibold text-warm-text mb-4">
        {TITLES[language] || TITLES.en}
      </h3>
      <div className="flex flex-wrap gap-2">
        {effects.map((effect, i) => {
          const severity = classifyEffect(effect)
          return (
            <span
              key={i}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-plex font-medium ${PILL_CLASSES[severity]}`}
            >
              {effect}
            </span>
          )
        })}
      </div>
      <div className="flex gap-4 mt-4 pt-4 border-t border-warm-border">
        <span className="flex items-center gap-1.5 text-xs font-plex text-warm-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> Mild
        </span>
        <span className="flex items-center gap-1.5 text-xs font-plex text-warm-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Moderate
        </span>
        <span className="flex items-center gap-1.5 text-xs font-plex text-warm-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Severe
        </span>
      </div>
    </div>
  )
}
