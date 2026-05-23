import SideEffects from './SideEffects.jsx'
import DoctorSignal from './DoctorSignal.jsx'
import DosageCard from './DosageCard.jsx'

const LABELS = {
  hy: {
    armenian: 'Հայերեն',
    russian: 'Ռուսերեն',
    sourcesPrefix: 'Աղբյուրներ',
    verified: 'Հաստատված է OpenFDA-ի տվյալների բազայով',
    notVerified: 'Աղբյուր: Groq AI',
    aiOnly: 'AI knowledge only',
    rx: 'Rx',
    otc: 'OTC',
  },
  ru: {
    armenian: 'Армянский',
    russian: 'Русский',
    sourcesPrefix: 'Источники',
    verified: 'Проверено по базе OpenFDA',
    notVerified: 'Источник: Groq AI',
    aiOnly: 'AI knowledge only',
    rx: 'Rx',
    otc: 'OTC',
  },
  en: {
    armenian: 'Armenian',
    russian: 'Russian',
    sourcesPrefix: 'Sources',
    verified: 'Verified against OpenFDA database',
    notVerified: 'Source: Groq AI',
    aiOnly: 'AI knowledge only',
    rx: 'Rx',
    otc: 'OTC',
  },
}

function RxBadge({ requiresPrescription, L }) {
  if (requiresPrescription === null || requiresPrescription === undefined) return null
  const label = requiresPrescription ? L.rx : L.otc
  return (
    <span
      className="inline-flex items-center font-mono font-medium text-warm-muted border border-warm-border rounded px-2 py-0.5"
      style={{ fontSize: 11 }}
    >
      {label}
    </span>
  )
}

export default function MedCard({ data, language }) {
  const L = LABELS[language] || LABELS.en

  return (
    <div className="w-full space-y-4">
      {/* ── 1. Summary ── */}
      <div className="card-min">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <h2 className="font-playfair text-warm-text" style={{ fontSize: 18, fontWeight: 700 }}>
            {data.drug_name}
          </h2>
          <RxBadge requiresPrescription={data.requires_prescription} L={L} />
          {!data.found && (
            <span
              className="font-mono text-warm-muted border border-warm-border rounded px-2 py-0.5"
              style={{ fontSize: 11 }}
            >
              {L.aiOnly}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {data.summary_hy && (
            <div>
              <p
                className="font-mono text-warm-muted uppercase tracking-wider mb-1.5"
                style={{ fontSize: 11 }}
              >
                {L.armenian}
              </p>
              <p
                className="font-plex text-warm-text"
                style={{ fontSize: 14, lineHeight: 1.7 }}
              >
                {data.summary_hy}
              </p>
            </div>
          )}
          {data.summary_ru && (
            <div>
              <p
                className="font-mono text-warm-muted uppercase tracking-wider mb-1.5"
                style={{ fontSize: 11 }}
              >
                {L.russian}
              </p>
              <p
                className="font-plex text-warm-text"
                style={{ fontSize: 14, lineHeight: 1.7 }}
              >
                {data.summary_ru}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. How to take ── */}
      <DosageCard card={data.dosage_card} language={language} />

      {/* ── 3. Side effects ── */}
      <SideEffects effects={data.side_effects} language={language} />

      {/* ── 4. Doctor signal ── */}
      <DoctorSignal
        signal={data.doctor_signal}
        reason={data.doctor_reason}
        language={language}
      />

      {/* ── 5. Sources ── */}
      <p
        className="font-mono text-warm-placeholder text-center pt-2"
        style={{ fontSize: 11 }}
      >
        {data.rag_used && data.citations && data.citations.length > 0
          ? L.verified
          : L.notVerified}
        {' · '}
        {data.processing_time_ms?.toFixed(0)}ms
      </p>
    </div>
  )
}
