// Small badge components used in MedCard header:
// - MedicationTypeBadge: icon + colored chip for the AI-classified type
// - PrescriptionBadge:   Rx (amber) vs OTC (green)

const TYPE_CONFIG = {
  antibiotic:         { icon: '🦠', en: 'Antibiotic',       ru: 'Антибиотик',       hy: 'Հակաբիոտիկ',          bg: 'bg-purple-100 text-purple-800' },
  painkiller:         { icon: '💊', en: 'Pain reliever',    ru: 'Обезболивающее',   hy: 'Ցավազրկող',            bg: 'bg-blue-100 text-blue-800' },
  antiviral:          { icon: '🛡',  en: 'Antiviral',        ru: 'Противовирусное',  hy: 'Հակավիրուսային',       bg: 'bg-indigo-100 text-indigo-800' },
  antifungal:         { icon: '🍄', en: 'Antifungal',       ru: 'Противогрибковое', hy: 'Հակասնկային',          bg: 'bg-teal-100 text-teal-800' },
  antihistamine:      { icon: '🤧', en: 'Antihistamine',    ru: 'Антигистаминное',  hy: 'Հակահիստամինային',      bg: 'bg-cyan-100 text-cyan-800' },
  antihypertensive:   { icon: '🫀', en: 'Blood pressure',   ru: 'Давление',         hy: 'Ճնշման դեղ',            bg: 'bg-rose-100 text-rose-800' },
  antidiabetic:       { icon: '🩸', en: 'Diabetes',         ru: 'Диабет',           hy: 'Շաքարային դիաբետ',      bg: 'bg-emerald-100 text-emerald-800' },
  antidepressant:     { icon: '🧠', en: 'Antidepressant',   ru: 'Антидепрессант',   hy: 'Հակադեպրեսանտ',         bg: 'bg-violet-100 text-violet-800' },
  vitamin:            { icon: '🌿', en: 'Vitamin',          ru: 'Витамин',          hy: 'Վիտամին',              bg: 'bg-lime-100 text-lime-800' },
  hormone:            { icon: '⚗️', en: 'Hormone',          ru: 'Гормон',           hy: 'Հորմոն',                bg: 'bg-pink-100 text-pink-800' },
  gi_medication:      { icon: '🍽', en: 'GI / Stomach',     ru: 'ЖКТ',              hy: 'ՍԱՀ',                   bg: 'bg-orange-100 text-orange-800' },
  respiratory:        { icon: '🌬', en: 'Respiratory',      ru: 'Дыхание',          hy: 'Շնչական',              bg: 'bg-sky-100 text-sky-800' },
  sedative:           { icon: '😴', en: 'Sedative',         ru: 'Седативное',       hy: 'Հանգստացնող',          bg: 'bg-slate-200 text-slate-800' },
  topical:            { icon: '🧴', en: 'Topical',          ru: 'Наружное',         hy: 'Արտաքին',              bg: 'bg-stone-200 text-stone-800' },
  other:              { icon: '💠', en: 'Medication',       ru: 'Лекарство',        hy: 'Դեղամիջոց',            bg: 'bg-gray-100 text-gray-700' },
}

export function MedicationTypeBadge({ type, language = 'en' }) {
  if (!type) return null
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other
  const label = cfg[language] || cfg.en
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-plex font-medium ${cfg.bg}`}>
      <span>{cfg.icon}</span>
      {label}
    </span>
  )
}

const PRESCRIPTION_TEXT = {
  rx: {
    hy: 'Rx — Դեղատոմս է հարկավոր',
    ru: 'Rx — Требуется рецепт',
    en: 'Rx — Prescription required',
  },
  otc: {
    hy: 'OTC — Առանց դեղատոմսի',
    ru: 'OTC — Без рецепта',
    en: 'OTC — Available without prescription',
  },
}

export function PrescriptionBadge({ requiresPrescription, language = 'en' }) {
  if (requiresPrescription === null || requiresPrescription === undefined) return null
  const key = requiresPrescription ? 'rx' : 'otc'
  const text = PRESCRIPTION_TEXT[key][language] || PRESCRIPTION_TEXT[key].en
  const cls = requiresPrescription
    ? 'bg-amber-100 text-amber-800'
    : 'bg-green-100 text-green-800'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-plex font-medium ${cls}`}>
      {text}
    </span>
  )
}
