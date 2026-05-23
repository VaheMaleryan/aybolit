import { useState, useEffect } from 'react'

/**
 * Amber dismissible banner shown above MedCard when the user's spelling
 * was auto-corrected by the fuzzy matcher.
 *
 * Clicking the suggested name re-runs the search with the canonical spelling
 * so the user can confirm. Dismissible via X button.
 */
export default function DidYouMeanBanner({ result, language, onSearch }) {
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissal whenever a new result arrives
  useEffect(() => {
    setDismissed(false)
  }, [result?.did_you_mean])

  if (!result || !result.did_you_mean || dismissed) return null

  const name = result.did_you_mean
  const text =
    language === 'hy' ? result.did_you_mean_hy :
    language === 'ru' ? result.did_you_mean_ru :
    `Did you mean ${name}`

  // Split prefix from drug name so we can render the name as a button
  // Fallback: render full text + name button if split fails
  const parts = text && text.includes(name) ? text.split(name) : [text, '']

  return (
    <div
      className="w-full max-w-4xl mx-auto rounded-lg border px-4 py-3 flex items-center justify-between gap-3"
      style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg shrink-0" aria-hidden>💡</span>
        <p className="font-plex text-sm text-warm-text leading-snug">
          {parts[0]}
          <button
            type="button"
            onClick={() => onSearch && onSearch(name)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
            style={{ color: '#8B1A1A' }}
          >
            {name}
          </button>
          {parts[1]}
          {language === 'hy' && '?'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-amber-200/60 transition-colors text-warm-muted text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
