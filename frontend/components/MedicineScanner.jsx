import { useRef, useState } from 'react'

const LABELS = {
  hy: {
    drop: 'Քաշեք լուսանկարը այստեղ',
    or: 'կամ',
    choose: 'ընտրեք ֆայլ',
    analyzing: 'Վերլուծում...',
    badType: 'Միայն JPEG, PNG կամ WEBP',
    tooLarge: 'Չափազանց մեծ ֆայլ (առավելագույնը 5MB)',
    notFound: 'Չհաջողվեց ճանաչել դեղամիջոցը։ Փորձեք ավելի պարզ լուսանկար։',
    drug: 'Դեղամիջոց',
    strength: 'Ուժ',
    form: 'Ձև',
    manufacturer: 'Արտադրող',
    ingredient: 'Բաղադրիչ',
    expires: 'Ժամկետ',
    warnings: 'Զգուշացումներ',
    instructions: 'Օգտագործում',
    explainBtn: 'Բացատրել այս դեղամիջոցը',
    reset: 'Մաքրել',
    backend: 'Backend',
  },
  ru: {
    drop: 'Перетащите фото сюда',
    or: 'или',
    choose: 'выберите файл',
    analyzing: 'Анализ...',
    badType: 'Только JPEG, PNG или WEBP',
    tooLarge: 'Файл слишком большой (макс 5MB)',
    notFound: 'Не удалось распознать лекарство. Попробуйте более чёткое фото.',
    drug: 'Лекарство',
    strength: 'Дозировка',
    form: 'Форма',
    manufacturer: 'Производитель',
    ingredient: 'Активное вещество',
    expires: 'Срок годности',
    warnings: 'Предупреждения',
    instructions: 'Применение',
    explainBtn: 'Объяснить это лекарство',
    reset: 'Очистить',
    backend: 'Backend',
  },
  en: {
    drop: 'Drop a photo here',
    or: 'or',
    choose: 'choose a file',
    analyzing: 'Analyzing...',
    badType: 'Only JPEG, PNG, or WEBP',
    tooLarge: 'File too large (max 5MB)',
    notFound: 'Could not read medication from this image. Try a clearer photo.',
    drug: 'Drug',
    strength: 'Strength',
    form: 'Form',
    manufacturer: 'Manufacturer',
    ingredient: 'Active ingredient',
    expires: 'Expires',
    warnings: 'Warnings',
    instructions: 'Instructions',
    explainBtn: 'Explain this medication',
    reset: 'Reset',
    backend: 'Backend',
  },
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_BYTES = 5 * 1024 * 1024


export function ScanForm({ language, loading, onUpload, onLocalError }) {
  const L = LABELS[language] || LABELS.en
  const fileInputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  function pick(file) {
    if (!file) return
    if (!ALLOWED_MIME.includes(file.type)) {
      onLocalError?.(L.badType)
      return
    }
    if (file.size > MAX_BYTES) {
      onLocalError?.(L.tooLarge)
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    onUpload(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    pick(e.dataTransfer.files?.[0])
  }

  function handleReset() {
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="w-full space-y-3">
      {!previewUrl && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border border-dashed flex flex-col items-center justify-center text-center transition-colors duration-150 ${
            dragOver ? 'border-arm-red bg-white' : 'border-warm-border bg-white'
          }`}
          style={{ height: 160 }}
        >
          <p className="font-plex text-warm-placeholder" style={{ fontSize: 14 }}>
            {L.drop}
          </p>
          <p className="font-plex text-warm-placeholder mt-2" style={{ fontSize: 13 }}>
            {L.or}{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-arm-red hover:underline focus:outline-none font-medium"
            >
              {L.choose}
            </button>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>
      )}

      {previewUrl && (
        <div className="flex items-start gap-3 bg-white border border-warm-border rounded-lg p-3">
          <img
            src={previewUrl}
            alt="preview"
            className="rounded border border-warm-border max-w-[140px] max-h-[140px] object-cover"
          />
          <div className="flex-1 flex flex-col gap-2">
            {loading && (
              <div className="flex items-center gap-2 text-warm-muted">
                <span className="inline-block w-3 h-3 border-2 border-arm-red border-t-transparent rounded-full animate-spin" />
                <span className="font-plex" style={{ fontSize: 13 }}>{L.analyzing}</span>
              </div>
            )}
            {!loading && (
              <button
                type="button"
                onClick={handleReset}
                className="self-start text-arm-red hover:underline font-plex font-medium"
                style={{ fontSize: 13 }}
              >
                {L.reset}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


export function ScanResult({ result, language, onExplain, error }) {
  const L = LABELS[language] || LABELS.en

  if (error) {
    return (
      <div className="card-min" style={{ borderLeft: '3px solid #991B1B' }}>
        <p className="font-plex text-warm-text" style={{ fontSize: 14 }}>{error}</p>
      </div>
    )
  }

  if (!result) return null

  if (!result.found) {
    return (
      <div className="card-min" style={{ borderLeft: '3px solid #B45309' }}>
        <p className="font-plex text-warm-text" style={{ fontSize: 14 }}>
          {result.error || L.notFound}
        </p>
      </div>
    )
  }

  const rows = [
    [L.drug, result.drug_name],
    [L.strength, result.dosage_strength],
    [L.form, result.dosage_form],
    [L.manufacturer, result.manufacturer],
    [L.ingredient, result.active_ingredient],
    [L.expires, result.expiry_date],
  ].filter(([, v]) => v)

  return (
    <div className="space-y-4">
      <div className="card-min">
        <dl className="divide-y divide-warm-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <dt
                className="font-mono text-warm-muted uppercase tracking-wider shrink-0"
                style={{ fontSize: 11 }}
              >
                {k}
              </dt>
              <dd
                className="font-plex text-warm-text text-right"
                style={{ fontSize: 14 }}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>

        {result.warnings_text && result.warnings_text.length > 0 && (
          <div className="mt-4 pt-4 border-t border-warm-border">
            <p
              className="font-mono text-warm-muted uppercase tracking-wider mb-2"
              style={{ fontSize: 11 }}
            >
              {L.warnings}
            </p>
            <ul className="space-y-1">
              {result.warnings_text.map((w, i) => (
                <li key={i} className="font-plex text-warm-text" style={{ fontSize: 14 }}>
                  · {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.instructions_text && (
          <div className="mt-4 pt-4 border-t border-warm-border">
            <p
              className="font-mono text-warm-muted uppercase tracking-wider mb-2"
              style={{ fontSize: 11 }}
            >
              {L.instructions}
            </p>
            <p className="font-plex text-warm-text" style={{ fontSize: 14 }}>
              {result.instructions_text}
            </p>
          </div>
        )}
      </div>

      {result.drug_name && (
        <button type="button" onClick={() => onExplain?.(result.drug_name)} className="btn-dark">
          {L.explainBtn}
        </button>
      )}

      <p
        className="font-mono text-warm-placeholder text-center"
        style={{ fontSize: 11 }}
      >
        {L.backend}: {result.ocr_backend}
      </p>
    </div>
  )
}
