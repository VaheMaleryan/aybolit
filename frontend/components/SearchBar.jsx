import { useState, useEffect, useRef } from 'react'

const PLACEHOLDERS = {
  hy: 'Դեղամիջոցի անունը...',
  ru: 'Название лекарства...',
  en: 'Medication name...',
}

const BUTTON_LABELS = {
  hy: 'Բացատրել դեղամիջոցը',
  ru: 'Объяснить лекарство',
  en: 'Explain medication',
}

const LOADING_LABELS = {
  hy: 'Բացատրում...',
  ru: 'Объясняем...',
  en: 'Explaining...',
}

const HINTS = {
  hy: 'Մուտքագրեք հայերեն, ռուսերեն կամ անգլերեն',
  ru: 'Введите на армянском, русском или английском',
  en: 'Type in Armenian, Russian, or English',
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SearchBar({ onSearch, language, loading, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Keep query in sync if parent passes a new initial value (e.g. OCR → Explain handoff)
  useEffect(() => {
    if (initialValue) setQuery(initialValue)
  }, [initialValue])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(val)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
          setShowSuggestions(true)
        }
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  function handleSelect(name) {
    setQuery(name)
    setSuggestions([])
    setShowSuggestions(false)
    onSearch(name)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim().length >= 2) {
      setShowSuggestions(false)
      onSearch(query.trim())
    }
  }

  return (
    <form ref={wrapperRef} onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={PLACEHOLDERS[language]}
          className="input-minimal"
          disabled={loading}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-border rounded-lg overflow-hidden z-30">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-4 py-2.5 font-plex text-warm-text text-sm hover:bg-gray-50 border-b border-warm-border last:border-b-0"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-warm-placeholder font-plex" style={{ fontSize: 12 }}>
        {HINTS[language]}
      </p>

      <button
        type="submit"
        disabled={loading || query.trim().length < 2}
        className="btn-dark"
      >
        {loading ? LOADING_LABELS[language] : BUTTON_LABELS[language]}
      </button>
    </form>
  )
}
