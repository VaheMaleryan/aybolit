import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import MedCard from './components/MedCard.jsx'
import DidYouMeanBanner from './components/DidYouMeanBanner.jsx'
import { InteractionForm, InteractionResult } from './components/InteractionChecker.jsx'
import { ScanForm, ScanResult } from './components/MedicineScanner.jsx'
import AybolitLogo from './Logo.jsx'

const API_BASE = 'http://localhost:8000'
const GITHUB_URL = 'https://github.com/VaheMaleryan/aybolit'

const TAB_LABELS = {
  hy: ['Բացատրել', 'Համատեղելի', 'Սկանավորել'],
  ru: ['Объяснить', 'Взаимодействие', 'Сканировать'],
  en: ['Explain', 'Interaction', 'Scan'],
}

const EMPTY_STATE = {
  hy: { title: 'Մուտքագրեք դեղամիջոցի անունը', sub: 'Արդյունքները կհայտնվեն այստեղ' },
  ru: { title: 'Введите название лекарства', sub: 'Результаты появятся здесь' },
  en: { title: 'Enter a medication name', sub: 'Results will appear here' },
}

const EMPTY_INTERACTION = {
  hy: { title: 'Մուտքագրեք երկու դեղամիջոց', sub: 'Համատեղելիության արդյունքը կհայտնվի այստեղ' },
  ru: { title: 'Введите два лекарства', sub: 'Результат взаимодействия появится здесь' },
  en: { title: 'Enter two medications', sub: 'Interaction result will appear here' },
}

const EMPTY_SCAN = {
  hy: { title: 'Վերբեռնեք դեղի լուսանկար', sub: 'Ճանաչված տվյալները կհայտնվեն այստեղ' },
  ru: { title: 'Загрузите фото лекарства', sub: 'Распознанные данные появятся здесь' },
  en: { title: 'Upload a medicine photo', sub: 'Extracted data will appear here' },
}

const LOADING = {
  hy: 'Բացատրում ենք դեղամիջոցը...',
  ru: 'Объясняем лекарство...',
  en: 'Looking up medication...',
}

const LOADING_INT = {
  hy: 'Ստուգում համատեղելիությունը...',
  ru: 'Проверяем взаимодействие...',
  en: 'Checking interaction...',
}

const LOADING_SCAN = {
  hy: 'Վերլուծում նկարը...',
  ru: 'Анализируем изображение...',
  en: 'Analyzing image...',
}

const FOOTER = {
  hy: 'Aybolit · Ստեղծել է Vahe Maleryan · 2026 · Բժշկական խորհուրդ չէ — միշտ խորհրդակցեք բժշկի հետ',
  ru: 'Aybolit · Сделано Vahe Maleryan · 2026 · Не медицинский совет — всегда консультируйтесь с врачом',
  en: 'Aybolit · Built by Vahe Maleryan · 2026 · Not medical advice — always consult a physician',
}

export default function App() {
  const [language, setLanguage] = useState('hy')
  const [tab, setTab] = useState(0)

  // Tab 0 — Explain
  const [explainResult, setExplainResult] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState('')
  const [explainSeed, setExplainSeed] = useState('') // pre-filled name (e.g. from OCR)

  // Tab 1 — Interaction
  const [interactionResult, setInteractionResult] = useState(null)
  const [interactionLoading, setInteractionLoading] = useState(false)
  const [interactionError, setInteractionError] = useState('')

  // Tab 2 — Scan
  const [ocrResult, setOcrResult] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  // ── Actions ─────────────────────────────────────────────
  async function runExplain(drugName) {
    setExplainLoading(true)
    setExplainError('')
    setExplainResult(null)
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
      setExplainResult(await res.json())
    } catch (e) {
      setExplainError(e.message || 'Something went wrong')
    } finally {
      setExplainLoading(false)
    }
  }

  async function runInteraction(d1, d2) {
    setInteractionLoading(true)
    setInteractionError('')
    setInteractionResult(null)
    try {
      const res = await fetch(`${API_BASE}/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug1: d1, drug2: d2, language }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      setInteractionResult(await res.json())
    } catch (e) {
      setInteractionError(e.message || 'Something went wrong')
    } finally {
      setInteractionLoading(false)
    }
  }

  async function runOCR(file) {
    setOcrLoading(true)
    setOcrError('')
    setOcrResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/ocr`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      setOcrResult(await res.json())
    } catch (e) {
      setOcrError(e.message || 'Something went wrong')
    } finally {
      setOcrLoading(false)
    }
  }

  function handleOcrExplain(drugName) {
    setExplainSeed(drugName)
    setTab(0)
    runExplain(drugName)
  }

  // ── Render ──────────────────────────────────────────────
  const tabs = TAB_LABELS[language]

  return (
    <div className="min-h-screen flex flex-col bg-warm-bg">
      {/* ─── Header (60px) ─────────────────────────────────────── */}
      <header
        className="bg-white border-b border-warm-border flex items-center px-4 sm:px-6"
        style={{ height: 60 }}
      >
        <div className="flex-1 flex items-center gap-2">
          <AybolitLogo width={40} />
          <span
            className="font-plex text-warm-text"
            style={{ fontSize: 16, fontWeight: 600 }}
          >
            Aybolit
          </span>
        </div>

        <div className="flex items-center text-warm-muted">
          {[['hy', 'HY'], ['ru', 'RU'], ['en', 'EN']].map(([code, label], i) => (
            <span key={code} className="flex items-center">
              {i > 0 && (
                <span className="text-warm-border mx-1" style={{ fontSize: 13 }}>
                  |
                </span>
              )}
              <button
                onClick={() => setLanguage(code)}
                className={`lang-btn ${language === code ? 'lang-btn-active' : 'lang-btn-inactive'}`}
                aria-label={label}
              >
                {label}
              </button>
            </span>
          ))}
        </div>
      </header>

      {/* ─── Main (two columns) ────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-warm-border">
        {/* Left panel — Input */}
        <section className="px-4 sm:px-8 py-6 sm:py-10">
          <div className="max-w-xl mx-auto md:mx-0 md:ml-auto md:mr-12">
            {/* Tabs */}
            <div
              className="flex items-end gap-6 mb-6 border-b border-warm-border"
            >
              {tabs.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={`tab-btn ${tab === i ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Active form */}
            {tab === 0 && (
              <SearchBar
                language={language}
                loading={explainLoading}
                onSearch={runExplain}
                initialValue={explainSeed}
              />
            )}
            {tab === 1 && (
              <InteractionForm
                language={language}
                loading={interactionLoading}
                onSubmit={runInteraction}
              />
            )}
            {tab === 2 && (
              <ScanForm
                language={language}
                loading={ocrLoading}
                onUpload={runOCR}
                onLocalError={setOcrError}
              />
            )}
          </div>
        </section>

        {/* Right panel — Results */}
        <section className="px-4 sm:px-8 py-6 sm:py-10 border-t md:border-t-0 border-warm-border">
          <div className="max-w-xl mx-auto md:mx-0 md:mr-auto md:ml-12">
            {tab === 0 && (
              <ExplainResultArea
                language={language}
                result={explainResult}
                loading={explainLoading}
                error={explainError}
                onSearch={runExplain}
              />
            )}
            {tab === 1 && (
              <InteractionResultArea
                language={language}
                result={interactionResult}
                loading={interactionLoading}
                error={interactionError}
              />
            )}
            {tab === 2 && (
              <ScanResultArea
                language={language}
                result={ocrResult}
                loading={ocrLoading}
                error={ocrError}
                onExplain={handleOcrExplain}
              />
            )}
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-warm-border bg-white">
        <p
          className="font-plex text-warm-placeholder text-center px-4 py-4"
          style={{ fontSize: 12 }}
        >
          <span>{FOOTER[language]}</span>
          {' · '}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-warm-text"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

// ── Right-panel helpers ─────────────────────────────────────
function EmptyState({ title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <p
        className="font-playfair text-warm-text"
        style={{ fontSize: 20, fontWeight: 600 }}
      >
        {title}
      </p>
      <p
        className="font-plex text-warm-placeholder mt-2"
        style={{ fontSize: 14 }}
      >
        {sub}
      </p>
    </div>
  )
}

function LoadingLine({ text }) {
  return (
    <p
      className="font-plex text-warm-muted text-center py-16"
      style={{ fontSize: 14 }}
    >
      {text}
    </p>
  )
}

function ErrorLine({ error }) {
  return (
    <div className="card-min" style={{ borderLeft: '3px solid #991B1B' }}>
      <p className="font-plex text-warm-text" style={{ fontSize: 14 }}>{error}</p>
    </div>
  )
}

function ExplainResultArea({ language, result, loading, error, onSearch }) {
  if (loading) return <LoadingLine text={LOADING[language]} />
  if (error) return <ErrorLine error={error} />
  if (!result) return <EmptyState {...EMPTY_STATE[language]} />
  return (
    <div className="space-y-4">
      <DidYouMeanBanner result={result} language={language} onSearch={onSearch} />
      <MedCard data={result} language={language} />
    </div>
  )
}

function InteractionResultArea({ language, result, loading, error }) {
  if (loading) return <LoadingLine text={LOADING_INT[language]} />
  if (error) return <ErrorLine error={error} />
  if (!result) return <EmptyState {...EMPTY_INTERACTION[language]} />
  return <InteractionResult result={result} language={language} />
}

function ScanResultArea({ language, result, loading, error, onExplain }) {
  if (loading) return <LoadingLine text={LOADING_SCAN[language]} />
  if (error && !result) return <ErrorLine error={error} />
  if (!result) return <EmptyState {...EMPTY_SCAN[language]} />
  return (
    <ScanResult result={result} language={language} onExplain={onExplain} error={error} />
  )
}
