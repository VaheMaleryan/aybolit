import { useState } from 'react'

const LABELS = {
  hy: {
    drug1: 'Առաջին դեղամիջոց',
    drug2: 'Երկրորդ դեղամիջոց',
    button: 'Ստուգել համատեղելիությունը',
    checking: 'Ստուգում...',
    armenian: 'Հայերեն',
    russian: 'Ռուսերեն',
    recommendation: 'Խորհուրդ',
    severity: 'Ծանրություն',
  },
  ru: {
    drug1: 'Первое лекарство',
    drug2: 'Второе лекарство',
    button: 'Проверить взаимодействие',
    checking: 'Проверяем...',
    armenian: 'Армянский',
    russian: 'Русский',
    recommendation: 'Рекомендация',
    severity: 'Тяжесть',
  },
  en: {
    drug1: 'First medication',
    drug2: 'Second medication',
    button: 'Check interaction',
    checking: 'Checking...',
    armenian: 'Armenian',
    russian: 'Russian',
    recommendation: 'Recommendation',
    severity: 'Severity',
  },
}

const VERDICT = {
  safe: {
    leftBorder: '#2D6A4F',
    title: { hy: 'Անվտանգ — սովորաբար կարելի է միասին ընդունել',
             ru: 'Безопасно — обычно можно принимать вместе',
             en: 'Safe — generally fine to take together' },
  },
  caution: {
    leftBorder: '#B45309',
    title: { hy: 'Զգուշորեն — հետևեք ախտանիշերին',
             ru: 'С осторожностью — следите за симптомами',
             en: 'Caution — monitor symptoms' },
  },
  dangerous: {
    leftBorder: '#991B1B',
    title: { hy: 'Վտանգավոր — անհապաղ դիմեք բժշկի',
             ru: 'Опасно — немедленно обратитесь к врачу',
             en: 'Dangerous — consult a doctor immediately' },
  },
}


export function InteractionForm({ language, loading, onSubmit }) {
  const L = LABELS[language] || LABELS.en
  const [drug1, setDrug1] = useState('')
  const [drug2, setDrug2] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (drug1.trim().length >= 2 && drug2.trim().length >= 2) {
      onSubmit(drug1.trim(), drug2.trim())
    }
  }

  const disabled = loading || drug1.trim().length < 2 || drug2.trim().length < 2

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div>
        <label className="block text-warm-muted font-plex mb-1.5" style={{ fontSize: 12 }}>
          {L.drug1}
        </label>
        <input
          type="text"
          value={drug1}
          onChange={e => setDrug1(e.target.value)}
          placeholder="e.g. Aspirin"
          className="input-minimal"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-warm-muted font-plex mb-1.5" style={{ fontSize: 12 }}>
          {L.drug2}
        </label>
        <input
          type="text"
          value={drug2}
          onChange={e => setDrug2(e.target.value)}
          placeholder="e.g. Warfarin"
          className="input-minimal"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={disabled} className="btn-dark">
        {loading ? L.checking : L.button}
      </button>
    </form>
  )
}


export function InteractionResult({ result, language }) {
  if (!result) return null
  const L = LABELS[language] || LABELS.en
  const cfg = VERDICT[result.verdict] || VERDICT.caution
  const title = cfg.title[language] || cfg.title.en
  const expHy = result.explanation_hy || ''
  const expRu = result.explanation_ru || ''

  return (
    <div className="space-y-4">
      <div
        className="card-min"
        style={{ borderLeft: `3px solid ${cfg.leftBorder}` }}
      >
        <p className="text-warm-muted font-mono uppercase tracking-wider" style={{ fontSize: 11 }}>
          {result.drug1} + {result.drug2}
        </p>
        <h3 className="font-playfair text-warm-text mt-1.5" style={{ fontSize: 18, fontWeight: 700 }}>
          {title}
        </h3>
      </div>

      {(expHy || expRu) && (
        <div className="card-min">
          {expHy && (
            <div>
              <p className="text-warm-muted font-mono uppercase tracking-wider mb-1.5" style={{ fontSize: 11 }}>
                {L.armenian}
              </p>
              <p className="font-plex text-warm-text" style={{ fontSize: 14, lineHeight: 1.7 }}>
                {expHy}
              </p>
            </div>
          )}
          {expHy && expRu && <div className="my-4 border-t border-warm-border" />}
          {expRu && (
            <div>
              <p className="text-warm-muted font-mono uppercase tracking-wider mb-1.5" style={{ fontSize: 11 }}>
                {L.russian}
              </p>
              <p className="font-plex text-warm-text" style={{ fontSize: 14, lineHeight: 1.7 }}>
                {expRu}
              </p>
            </div>
          )}
        </div>
      )}

      {result.recommendation && (
        <div className="card-min">
          <p className="text-warm-muted font-mono uppercase tracking-wider mb-1.5" style={{ fontSize: 11 }}>
            {L.recommendation}
          </p>
          <p className="font-plex text-warm-text" style={{ fontSize: 14, lineHeight: 1.7 }}>
            {result.recommendation}
          </p>
        </div>
      )}

      {result.severity && result.severity !== 'none' && (
        <p className="font-mono text-warm-placeholder text-center" style={{ fontSize: 11 }}>
          {L.severity}: {result.severity} · {result.processing_time_ms?.toFixed(0)}ms
        </p>
      )}
    </div>
  )
}
