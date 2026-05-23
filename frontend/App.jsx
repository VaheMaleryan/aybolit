import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import MedCard from './components/MedCard.jsx'
import InteractionChecker from './components/InteractionChecker.jsx'
import DidYouMeanBanner from './components/DidYouMeanBanner.jsx'
import MedicineScanner from './components/MedicineScanner.jsx'
import AybolitLogo from './Logo.jsx'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = {
  hy: [
    { label: 'Բացատրել', icon: '💊' },
    { label: 'Համատեղելիություն', icon: '🔍' },
    { label: 'Սկանավորել', icon: '📷' },
  ],
  ru: [
    { label: 'Объяснить', icon: '💊' },
    { label: 'Взаимодействие', icon: '🔍' },
    { label: 'Сканировать', icon: '📷' },
  ],
  en: [
    { label: 'Explain', icon: '💊' },
    { label: 'Check', icon: '🔍' },
    { label: 'Scan', icon: '📷' },
  ],
}

const HERO = {
  hy: {
    title: 'Այբոլիտ · Aybolit',
    subtitle: 'Հասկացեք ձեր դեղամիջոցը հայերեն և ռուսերեն',
    disclaimer: 'Միայն կրթական նպատակով։ Բժշկական որոշումների համար դիմեք բժշկի։',
  },
  ru: {
    title: 'Айболит · Aybolit',
    subtitle: 'Понимайте своё лекарство на армянском и русском',
    disclaimer: 'Только в образовательных целях. Для медицинских решений проконсультируйтесь с врачом.',
  },
  en: {
    title: 'Aybolit · Այբոլիտ',
    subtitle: 'Understand your medication in Armenian and Russian',
    disclaimer: 'Educational information only. Always consult a licensed physician for medical decisions.',
  },
}

const STATES = {
  hy: {
    loading: 'Բացատրում ենք դեղամիջոցը...',
    emptyTitle: 'Aybolit',
    emptySub: 'Մուտքագրեք դեղամիջոցի անունը՝ սկսելու համար',
    features: [
      { icon: '💊', text: 'Բացատրում է ցանկացած դեղ' },
      { icon: '🌍', text: 'Հայերեն · Ռուսերեն · Անգլերեն' },
      { icon: '📷', text: 'Սկանավորում է դեղի տուփ' },
    ],
    errorFallback: 'Ինչ-որ բան սխալվեց։ Խնդրում ենք փորձել նորից։',
  },
  ru: {
    loading: 'Объясняем лекарство...',
    emptyTitle: 'Aybolit',
    emptySub: 'Введите название лекарства, чтобы начать',
    features: [
      { icon: '💊', text: 'Объясняет любое лекарство' },
      { icon: '🌍', text: 'Армянский · Русский · Английский' },
      { icon: '📷', text: 'Сканирует упаковку лекарства' },
    ],
    errorFallback: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
  en: {
    loading: 'Explaining medication...',
    emptyTitle: 'Aybolit',
    emptySub: 'Type a medication name to get started',
    features: [
      { icon: '💊', text: 'Explains any medication' },
      { icon: '🌍', text: 'Armenian · Russian · English' },
      { icon: '📷', text: 'Scans medicine boxes' },
    ],
    errorFallback: 'Something went wrong. Please try again.',
  },
}

const GITHUB_URL = 'https://github.com/VaheMaleryan/aybolit'

export default function App() {
  const [language, setLanguage] = useState('hy')
  const [activeTab, setActiveTab] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hero = HERO[language]
  const tabs = TABS[language]
  const S = STATES[language]

  async function handleSearch(drugName) {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug_name: drugName, language }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message ? `${S.errorFallback} (${e.message})` : S.errorFallback)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* ── Header with logo ────────────────────────────────────── */}
      <header className="bg-white border-b border-warm-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              {/* Desktop logo */}
              <span className="hidden sm:inline-block">
                <AybolitLogo width={110} />
              </span>
              {/* Compact logo on mobile */}
              <span className="inline-block sm:hidden">
                <AybolitLogo width={64} />
              </span>
            </div>
            <div className="min-w-0">
              <div
                className="font-playfair text-warm-text leading-none"
                style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}
              >
                Aybolit
              </div>
              <div
                className="font-playfair text-warm-muted truncate"
                style={{ fontSize: 13 }}
              >
                Այbolit · Айболит
              </div>
            </div>
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-warm-border shrink-0">
            {[['hy', '🇦🇲'], ['ru', '🇷🇺'], ['en', '🇬🇧']].map(([code, flag]) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`lang-btn ${language === code ? 'lang-btn-active' : 'lang-btn-inactive'}`}
                aria-label={code.toUpperCase()}
              >
                <span className="mr-1">{flag}</span>
                <span className="hidden sm:inline">{code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-warm-border py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-warm-text mb-3">
            {hero.title}
          </h2>
          <p className="font-plex text-base sm:text-lg text-warm-muted mb-7">
            {hero.subtitle}
          </p>

          {/* Tabs */}
          <div className="flex justify-center mb-8 border-b border-warm-border overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1 sm:gap-2">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveTab(i); setResult(null); setError('') }}
                  className={`tab-btn ${activeTab === i ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                >
                  <span className="mr-1.5" aria-hidden>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: Search bar lives in the hero */}
          {activeTab === 0 && (
            <SearchBar onSearch={handleSearch} language={language} loading={loading} />
          )}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 0 && (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 border-4 border-arm-red border-t-transparent rounded-full animate-spin" />
                <p className="font-plex text-warm-muted">{S.loading}</p>
              </div>
            )}
            {error && (
              <div className="card border-red-200 bg-red-50 max-w-2xl mx-auto">
                <p className="font-plex text-red-700">{error}</p>
              </div>
            )}
            {result && !loading && (
              <div className="space-y-5">
                <DidYouMeanBanner
                  result={result}
                  language={language}
                  onSearch={handleSearch}
                />
                <MedCard data={result} language={language} />
              </div>
            )}

            {/* Empty state — branded with logo + feature pills */}
            {!result && !loading && !error && (
              <div className="text-center py-12 sm:py-16 flex flex-col items-center gap-5">
                <AybolitLogo width={120} className="opacity-90" />
                <h2 className="font-playfair text-3xl font-bold text-warm-text">
                  {S.emptyTitle}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
                  {S.features.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-warm-border text-sm font-plex text-warm-text"
                    >
                      <span aria-hidden>{f.icon}</span>
                      {f.text}
                    </span>
                  ))}
                </div>
                <p className="font-plex text-warm-muted text-sm">{S.emptySub}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 1 && (
          <InteractionChecker language={language} />
        )}

        {activeTab === 2 && (
          <MedicineScanner
            language={language}
            onExplain={(drugName) => {
              setActiveTab(0)
              handleSearch(drugName)
            }}
          />
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-warm-border bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-7 flex flex-col items-center gap-3 text-center">
          <AybolitLogo width={60} className="opacity-90" />
          <div>
            <div className="font-playfair text-lg font-semibold text-warm-text">
              Aybolit · Այbolit
            </div>
            <div className="font-plex text-xs text-warm-muted mt-0.5">
              Armenian medication assistant
            </div>
          </div>
          <p className="font-plex text-xs text-warm-muted max-w-2xl">
            {hero.disclaimer}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs font-plex text-warm-muted">
            <span>Built by Vahe Maleryan</span>
            <span aria-hidden>·</span>
            <span>2026</span>
            <span aria-hidden>·</span>
            <span>MIT License</span>
            <span aria-hidden>·</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-warm-text transition-colors"
              aria-label="GitHub repository"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
