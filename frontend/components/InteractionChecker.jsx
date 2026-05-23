import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LABELS = {
  hy: {
    drug1: 'Առաջին դեղամիջոց',
    drug2: 'Երկրորդ դեղամիջոց',
    button: 'Ստուգել համատեղելիությունը',
    checking: 'Ստուգում...',
    armenian: 'Հայերեն',
    russian: 'Ռուսերեն',
    recommendation: 'Խորհուրդ',
    severity: 'Ծանրության աստիճան',
    error: 'Չհաջողվեց ստուգել: Փորձեք նորից:',
  },
  ru: {
    drug1: 'Первое лекарство',
    drug2: 'Второе лекарство',
    button: 'Проверить взаимодействие',
    checking: 'Проверяем...',
    armenian: 'По-армянски',
    russian: 'По-русски',
    recommendation: 'Рекомендация',
    severity: 'Степень тяжести',
    error: 'Не удалось проверить. Попробуйте ещё раз.',
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
    error: 'Could not check interaction. Please try again.',
  },
}

const VERDICT_CONFIG = {
  safe: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    icon: '✓',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    title: {
      hy: 'Ընդհանուր առմամբ անվտանգ համատեղ ընդունման համար',
      ru: 'Обычно безопасно принимать вместе',
      en: 'Generally safe together',
    },
    titleColor: 'text-green-800',
  },
  caution: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: '⚠',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    title: {
      hy: 'Զգուշորեն — հետևեք ախտանիշերին',
      ru: 'С осторожностью — следите за симптомами',
      en: 'Use with caution — monitor symptoms',
    },
    titleColor: 'text-amber-800',
  },
  dangerous: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    icon: '⚠',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    title: {
      hy: 'Վտանգավոր համակցություն — անհապաղ դիմեք բժշկի',
      ru: 'Опасное сочетание — немедленно обратитесь к врачу',
      en: 'Dangerous combination — consult doctor immediately',
    },
    titleColor: 'text-red-800',
  },
}

export default function InteractionChecker({ language }) {
  const [drug1, setDrug1] = useState('')
  const [drug2, setDrug2] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const L = LABELS[language] || LABELS.en

  async function handleCheck(e) {
    e.preventDefault()
    if (!drug1.trim() || !drug2.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug1: drug1.trim(), drug2: drug2.trim(), language }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message ? `${L.error} (${e.message})` : L.error)
    } finally {
      setLoading(false)
    }
  }

  const verdict = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.caution : null

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <form onSubmit={handleCheck} className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-plex font-medium text-warm-muted mb-1.5">
              {L.drug1}
            </label>
            <input
              type="text"
              value={drug1}
              onChange={e => setDrug1(e.target.value)}
              placeholder="e.g. Aspirin"
              className="w-full px-4 py-3 border-2 border-warm-border rounded-lg font-plex text-warm-text placeholder-warm-muted focus:outline-none focus:border-arm-red transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-plex font-medium text-warm-muted mb-1.5">
              {L.drug2}
            </label>
            <input
              type="text"
              value={drug2}
              onChange={e => setDrug2(e.target.value)}
              placeholder="e.g. Warfarin"
              className="w-full px-4 py-3 border-2 border-warm-border rounded-lg font-plex text-warm-text placeholder-warm-muted focus:outline-none focus:border-arm-red transition-colors"
              disabled={loading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || drug1.trim().length < 2 || drug2.trim().length < 2}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? L.checking : L.button}
        </button>
      </form>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <p className="font-plex text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && verdict && (
        <div className={`card border-2 ${verdict.bg} ${verdict.border}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full ${verdict.iconBg} ${verdict.iconColor} font-bold`}>
              {verdict.icon}
            </span>
            <div>
              <p className="font-plex text-xs text-warm-muted uppercase tracking-wide">
                {result.drug1} + {result.drug2}
              </p>
              <h3 className={`font-playfair text-xl font-semibold ${verdict.titleColor}`}>
                {verdict.title[language] || verdict.title.en}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-plex font-semibold text-warm-muted uppercase tracking-wide mb-1.5">
                🇦🇲 {L.armenian}
              </p>
              <p className="font-playfair text-warm-text leading-relaxed">{result.explanation_hy}</p>
            </div>
            <div>
              <p className="text-xs font-plex font-semibold text-warm-muted uppercase tracking-wide mb-1.5">
                🇷🇺 {L.russian}
              </p>
              <p className="font-plex text-warm-text leading-relaxed">{result.explanation_ru}</p>
            </div>
          </div>

          {result.recommendation && (
            <div className="border-t border-current border-opacity-20 pt-4">
              <p className="text-xs font-plex font-semibold text-warm-muted uppercase tracking-wide mb-1.5">
                {L.recommendation}
              </p>
              <p className="font-plex text-warm-text">{result.recommendation}</p>
            </div>
          )}

          {result.severity && result.severity !== 'none' && (
            <p className="text-xs font-plex text-warm-muted mt-3">
              {L.severity}: <span className="font-medium capitalize">{result.severity}</span>
              {' · '}{result.processing_time_ms.toFixed(0)}ms
            </p>
          )}
        </div>
      )}
    </div>
  )
}
