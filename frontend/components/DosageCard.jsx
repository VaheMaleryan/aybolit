// Minimal "How to take" card — 3 items only.
const TITLE = {
  hy: 'Ինչպես ընդունել',
  ru: 'Как принимать',
  en: 'How to take',
}

const LABELS = {
  hy: { dose: 'Դոզա', freq: 'Հաճախականություն', food: 'Ուտելիքով' },
  ru: { dose: 'Доза', freq: 'Частота', food: 'С едой' },
  en: { dose: 'Dose', freq: 'Frequency', food: 'With food' },
}

const FOOD_LABEL = {
  hy: { yes: 'Այո', no: 'Ոչ — դատարկ ստամոքսով', preferred: 'Ցանկալի է' },
  ru: { yes: 'Да', no: 'Нет — натощак', preferred: 'Желательно' },
  en: { yes: 'Yes', no: 'No — empty stomach', preferred: 'Preferred' },
}

function Item({ label, value }) {
  return (
    <div>
      <p
        className="font-mono text-warm-muted uppercase tracking-wider mb-1"
        style={{ fontSize: 11 }}
      >
        {label}
      </p>
      <p
        className="font-plex text-warm-text"
        style={{ fontSize: 14, lineHeight: 1.45 }}
      >
        {value || '—'}
      </p>
    </div>
  )
}

export default function DosageCard({ card, language }) {
  if (!card) return null
  const L = LABELS[language] || LABELS.en
  const title = TITLE[language] || TITLE.en
  const wf = card.with_food || 'preferred'
  const foodLabel = (FOOD_LABEL[language] || FOOD_LABEL.en)[wf]
    || FOOD_LABEL.en.preferred

  return (
    <div className="card-min">
      <p
        className="font-mono text-warm-muted uppercase tracking-wider mb-4"
        style={{ fontSize: 11 }}
      >
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Item label={L.dose} value={card.how_many} />
        <Item label={L.freq} value={card.how_often} />
        <Item label={L.food} value={foodLabel} />
      </div>
    </div>
  )
}
