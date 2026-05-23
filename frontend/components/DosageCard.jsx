const TITLE = {
  hy: 'Ինչպես ընդունել',
  ru: 'Как принимать',
  en: 'How to take',
}

const LABELS = {
  hy: {
    how_many: 'Քանի',
    how_often: 'Որքան հաճախ',
    with_food: 'Ուտելիքով',
    duration: 'Տևողություն',
    max_per_day: 'Օրական առավելագույնը',
    notes: 'Հատուկ նշումներ',
    food_yes: 'Այո',
    food_no: 'Ոչ — դատարկ ստամոքսով',
    food_preferred: 'Ցանկալի է',
  },
  ru: {
    how_many: 'Сколько',
    how_often: 'Как часто',
    with_food: 'С едой',
    duration: 'Длительность',
    max_per_day: 'Максимум в день',
    notes: 'Особые указания',
    food_yes: 'Да',
    food_no: 'Нет — натощак',
    food_preferred: 'Желательно',
  },
  en: {
    how_many: 'How many',
    how_often: 'How often',
    with_food: 'With food',
    duration: 'Duration',
    max_per_day: 'Max per day',
    notes: 'Special notes',
    food_yes: 'Yes',
    food_no: 'No — empty stomach',
    food_preferred: 'Preferred',
  },
}

const FOOD_STYLE = {
  yes: 'bg-green-50 border-green-200',
  no: 'bg-red-50 border-red-200',
  preferred: 'bg-amber-50 border-amber-200',
}

const FOOD_TEXT_COLOR = {
  yes: 'text-green-800',
  no: 'text-red-800',
  preferred: 'text-amber-800',
}

function Cell({ icon, label, value, accent = false, extraClass = '' }) {
  return (
    <div
      className={`bg-white border border-warm-border rounded-lg p-4 ${extraClass}`}
      style={accent ? { borderLeft: '3px solid #8B1A1A' } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-plex text-[10px] font-semibold tracking-wider uppercase text-warm-muted mb-1">
            {label}
          </p>
          <div className="font-plex text-sm font-medium text-warm-text leading-snug break-words">
            {value || <span className="text-warm-muted italic">—</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DosageCard({ card, language }) {
  if (!card) return null
  const L = LABELS[language] || LABELS.en
  const title = TITLE[language] || TITLE.en
  const wf = card.with_food || 'preferred'
  const foodStyle = FOOD_STYLE[wf] || FOOD_STYLE.preferred
  const foodTextColor = FOOD_TEXT_COLOR[wf] || FOOD_TEXT_COLOR.preferred
  const foodLabel = L[`food_${wf}`] || L.food_preferred

  const foodValue = (
    <div>
      <div className={`font-semibold ${foodTextColor}`}>{foodLabel}</div>
      {card.with_food_note && (
        <div className="font-plex text-xs text-warm-muted mt-1">{card.with_food_note}</div>
      )}
    </div>
  )

  const notesValue = card.special_notes && card.special_notes.length > 0 ? (
    <ul className="space-y-0.5">
      {card.special_notes.map((n, i) => (
        <li key={i} className="text-xs leading-snug">• {n}</li>
      ))}
    </ul>
  ) : null

  return (
    <div className="card">
      <h3 className="font-playfair text-xl font-semibold text-warm-text mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Cell icon="💊" label={L.how_many} value={card.how_many} accent />
        <Cell icon="🕐" label={L.how_often} value={card.how_often} accent />
        <Cell
          icon="🍽"
          label={L.with_food}
          value={foodValue}
          extraClass={foodStyle}
        />
        <Cell icon="📅" label={L.duration} value={card.duration} accent />
        <Cell icon="⚠️" label={L.max_per_day} value={card.max_per_day} accent />
        <Cell icon="📝" label={L.notes} value={notesValue} accent />
      </div>
    </div>
  )
}
