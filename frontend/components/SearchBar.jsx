import { useState, useEffect, useRef } from 'react'

const PLACEHOLDERS = {
  hy: 'Մուտqagrel deghami9oci anune...',
  ru: 'Введите название лекарства...',
  en: 'Enter medication name...',
}

const BUTTON_LABELS = {
  hy: 'Բacer · Explain',
  ru: 'Объяснить · Explain',
  en: 'Explain',
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SearchBar({ onSearch, language, loading }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

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
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={PLACEHOLDERS[language]}
            className="w-full px-5 py-4 text-lg border-2 border-warm-border rounded-xl bg-white font-plex text-warm-text placeholder-warm-muted focus:outline-none focus:border-arm-red transition-colors duration-200"
            disabled={loading}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-border rounded-xl shadow-lg z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="w-full text-left px-5 py-3 font-plex text-warm-text hover:bg-gray-50 transition-colors duration-150 border-b border-warm-border last:border-b-0"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              ...
            </span>
          ) : BUTTON_LABELS[language]}
        </button>
      </form>
    </div>
  )
}
