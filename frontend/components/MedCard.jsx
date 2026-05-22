import { SignalBadge } from './DoctorSignal.jsx'
import SideEffects from './SideEffects.jsx'
import DoctorSignal from './DoctorSignal.jsx'

const LABELS = {
  hy: {
    what: 'Inge ari hamar e',
    dosage: 'Jamanak u dzerq',
    armenian: 'Hayereni bancatrutyan',
    russian: 'Русское объяснение',
    food: 'Kareli e utelik@',
    noFood: 'Uteliqits ankaxy',
    aiNote: 'AI knowledge only',
    source: 'Albyur',
  },
  ru: {
    what: 'Для чего это лекарство',
    dosage: 'Дозировка и приём',
    armenian: 'Объяснение на армянском',
    russian: 'Объяснение на русском',
    food: 'Можно принимать с едой',
    noFood: 'Принимать натощак',
    aiNote: 'только знания ИИ',
    source: 'Источник',
  },
  en: {
    what: 'What it does',
    dosage: 'Dosage & Timing',
    armenian: 'Armenian explanation',
    russian: 'Russian explanation',
    food: 'Safe with food',
    noFood: 'Take without food',
    aiNote: 'AI knowledge only',
    source: 'Source',
  },
}

export default function MedCard({ data, language }) {
  const L = LABELS[language] || LABELS.en

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-playfair text-3xl font-bold text-warm-text">{data.drug_name}</h2>
            {!data.found && (
              <span className="inline-block mt-1 text-xs font-plex text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                {L.source}: {L.aiNote}
              </span>
            )}
          </div>
          <SignalBadge signal={data.doctor_signal} />
        </div>
      </div>

      {/* What it does */}
      <div className="card">
        <p className="font-playfair text-xl text-warm-text leading-relaxed">{data.what_it_does}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-sm font-plex font-medium px-2.5 py-1 rounded-full ${data.safe_with_food ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {data.safe_with_food ? `✓ ${L.food}` : `✗ ${L.noFood}`}
          </span>
        </div>
      </div>

      {/* Bilingual explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-amber-50 border-amber-100">
          <h3 className="font-playfair text-sm font-semibold text-warm-muted uppercase tracking-wide mb-3">
            🇦🇲 {L.armenian}
          </h3>
          <p className="font-playfair text-lg text-warm-text leading-relaxed">{data.summary_hy}</p>
        </div>
        <div className="card bg-blue-50 border-blue-100">
          <h3 className="font-plex text-sm font-semibold text-warm-muted uppercase tracking-wide mb-3">
            🇷🇺 {L.russian}
          </h3>
          <p className="font-plex text-base text-warm-text leading-relaxed">{data.summary_ru}</p>
        </div>
      </div>

      {/* Dosage */}
      <div className="card">
        <h3 className="font-playfair text-xl font-semibold text-warm-text mb-3">{L.dosage}</h3>
        <p className="font-plex text-warm-text leading-relaxed">{data.dosage_guidance}</p>
      </div>

      {/* Side effects */}
      <SideEffects effects={data.side_effects} language={language} />

      {/* Doctor signal */}
      <DoctorSignal signal={data.doctor_signal} reason={data.doctor_reason} language={language} />

      {/* Meta */}
      <p className="text-center text-xs font-plex text-warm-muted">
        {L.source}: {data.source} · {data.model} · {data.processing_time_ms.toFixed(0)}ms
      </p>
    </div>
  )
}
