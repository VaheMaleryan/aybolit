import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import MedCard from './components/MedCard.jsx'
import InteractionChecker from './components/InteractionChecker.jsx'

const API_BASE = import.meta.env.PROD
  ? 'https://deghatun-api.up.railway.app'
  : '/api'

const TABS = {
  hy: ['Deghami9ocayin bancatrutyan', 'Qnnel ǝndardznutyune'],
  ru: ['Объяснить лекарство', 'Проверить взаимодействие'],
  en: ['Explain medication', 'Check interaction'],
}

const HERO = {
  hy: {
    title: 'Deghatun · Դeghатун',
    subtitle: 'Haskatsek jer deghami9oce hayereni ev russereni',
    disclaimer: 'Krtchutyan npatakov miayin. Bjankayin vochandzotneri hamar dimate bjshki:',
  },
  ru: {
    title: 'Deghatun · Дегатун',
    subtitle: 'Понимайте своё лекарство на армянском и русском',
    disclaimer: 'Только в образовательных целях. Для медицинских решений проконсультируйтесь с врачом.',
  },
  en: {
    title: 'Deghatun · Դeghатун',
    subtitle: 'Understand your medication in Armenian and Russian',
    disclaimer: 'Educational information only. Always consult a licensed physician for medical decisions.',
  },
}

export default function App() {
  const [language, setLanguage] = useState('hy')
  const [activeTab, setActiveTab] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hero = HERO[language]
  const tabs = TABS[language]

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
        throw new Error(err.detail || 'API error')
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Header */}
      <header className="bg-white border-b border-warm-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-arm-red">Deghatun</h1>
            <p className="font-plex text-xs text-warm-muted leading-tight">Դeghатун · Armenian Medication Assistant</p>
          </div>
          {/* Language selector */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-warm-border">
            {[['hy', '🇦🇲 ՀԱՅ'], ['ru', '🇷🇺 РУС'], ['en', '🇬🇧 ENG']].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`lang-btn ${language === code ? 'lang-btn-active' : 'lang-btn-inactive'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-warm-border py-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-warm-text mb-3">
            {hero.title}
          </h2>
          <p className="font-plex text-lg text-warm-muted mb-8">{hero.subtitle}</p>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveTab(i); setResult(null); setError('') }}
                  className={`px-5 py-2.5 rounded-lg font-plex font-medium text-sm transition-all duration-200 ${
                    activeTab === i
                      ? 'bg-white text-warm-text shadow-sm border border-warm-border'
                      : 'text-warm-muted hover:text-warm-text'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: Search */}
          {activeTab === 0 && (
            <SearchBar onSearch={handleSearch} language={language} loading={loading} />
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab 1 results */}
        {activeTab === 0 && (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 border-4 border-arm-red border-t-transparent rounded-full animate-spin" />
                <p className="font-plex text-warm-muted">Bnutagrum deghami9oce...</p>
              </div>
            )}
            {error && (
              <div className="card border-red-200 bg-red-50 max-w-2xl mx-auto">
                <p className="font-plex text-red-700">{error}</p>
              </div>
            )}
            {result && !loading && (
              <MedCard data={result} language={language} />
            )}
            {!result && !loading && !error && (
              <div className="text-center py-16 space-y-3">
                <p className="font-playfair text-2xl text-warm-muted">Deghami9oci anune miqtagrel verei</p>
                <p className="font-plex text-warm-muted text-sm">Hayereni, russereni kam anglereni</p>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Interaction checker */}
        {activeTab === 1 && (
          <InteractionChecker language={language} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-border bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="font-plex text-xs text-warm-muted max-w-2xl mx-auto">
            {hero.disclaimer}
          </p>
          <p className="font-plex text-xs text-warm-muted mt-2">
            © 2024 Deghatun · Built for Armenian patients · MIT License
          </p>
        </div>
      </footer>
    </div>
  )
}
