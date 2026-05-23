import { useState, useEffect } from 'react'

// Minimal one-line suggestion. Plain text on white, dismissible.
export default function DidYouMeanBanner({ result, language, onSearch }) {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => { setDismissed(false) }, [result?.did_you_mean])

  if (!result || !result.did_you_mean || dismissed) return null
  const name = result.did_you_mean

  const text =
    language === 'hy' ? `Նկատի ունեի՞ք ${name}` :
    language === 'ru' ? `Вы имели в виду ${name}` :
    `Did you mean ${name}`

  const before = text.replace(name, '').replace(/\s+$/, '')

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <p className="font-plex text-warm-muted" style={{ fontSize: 13 }}>
        {before}{' '}
        <button
          type="button"
          onClick={() => onSearch?.(name)}
          className="text-arm-red font-medium hover:underline focus:outline-none"
        >
          {name}
        </button>
        {language === 'hy' && '?'}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-warm-placeholder hover:text-warm-text leading-none"
        style={{ fontSize: 18 }}
      >
        ×
      </button>
    </div>
  )
}
