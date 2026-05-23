import { useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LABELS = {
  hy: {
    title: 'Լուսանկարեք դեղի տուփը',
    sub: 'կամ դեղատոմս / ներդիր',
    choose: 'Ընտրել նկարը',
    camera: 'Բացել տեսախցիկը',
    drag: 'Քաշեք-բացթողեք նկարը այստեղ',
    analyzing: 'Վերլուծում ենք...',
    cloud: 'Աշխատում է Groq Vision-ով',
    local: 'Աշխատում է Tesseract-ով (լոկալ)',
    notFound: 'Չհաջողվեց ճանաչել դեղամիջոցը։ Փորձեք ավելի պարզ լուսանկար։',
    retry: 'Փորձել նորից',
    explainBtn: '🔍 Բացատրել այս դեղամիջոցը',
    scanned: 'Սկանավորված',
    drug: 'Դեղամիջոց',
    strength: 'Ուժ',
    form: 'Ձև',
    manufacturer: 'Արտադրող',
    ingredient: 'Բաղադրիչ',
    expires: 'Ժամկետ',
    warnings: 'Զգուշացումներ',
    instructions: 'Օգտագործում',
    tooLarge: 'Նկարը չափազանց մեծ է (առավելագույնը 5MB)',
    badType: 'Միայն JPEG / PNG / WEBP',
  },
  ru: {
    title: 'Сфотографируйте упаковку лекарства',
    sub: 'или рецепт / вкладыш',
    choose: 'Выбрать фото',
    camera: 'Сделать фото',
    drag: 'Перетащите изображение сюда',
    analyzing: 'Анализируем...',
    cloud: 'На базе Groq Vision',
    local: 'На базе Tesseract (локально)',
    notFound: 'Не удалось распознать лекарство. Попробуйте более чёткое фото.',
    retry: 'Попробовать ещё раз',
    explainBtn: '🔍 Объяснить это лекарство',
    scanned: 'Распознано',
    drug: 'Лекарство',
    strength: 'Дозировка',
    form: 'Форма',
    manufacturer: 'Производитель',
    ingredient: 'Активное вещество',
    expires: 'Срок годности',
    warnings: 'Предупреждения',
    instructions: 'Применение',
    tooLarge: 'Файл слишком большой (макс 5MB)',
    badType: 'Только JPEG / PNG / WEBP',
  },
  en: {
    title: 'Take a photo of the medicine box',
    sub: 'or prescription / leaflet',
    choose: 'Choose photo',
    camera: 'Take photo',
    drag: 'Drag and drop image here',
    analyzing: 'Analyzing...',
    cloud: 'Powered by Groq Vision',
    local: 'Powered by Tesseract (local)',
    notFound: 'Could not read medication from this image. Try a clearer photo with better lighting.',
    retry: 'Try again',
    explainBtn: '🔍 Explain this medication',
    scanned: 'Scanned',
    drug: 'Drug',
    strength: 'Strength',
    form: 'Form',
    manufacturer: 'Manufacturer',
    ingredient: 'Active ingredient',
    expires: 'Expires',
    warnings: 'Warnings',
    instructions: 'Instructions',
    tooLarge: 'File too large (max 5MB)',
    badType: 'Only JPEG / PNG / WEBP supported',
  },
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_BYTES = 5 * 1024 * 1024

export default function MedicineScanner({ language, onExplain }) {
  const L = LABELS[language] || LABELS.en
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  async function uploadFile(file) {
    setError('')
    setResult(null)

    if (!ALLOWED_MIME.includes(file.type)) {
      setError(L.badType)
      return
    }
    if (file.size > MAX_BYTES) {
      setError(L.tooLarge)
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/ocr`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
      if (!data.found && !data.error) {
        // surface a friendly message even when backend returned a clean
        // "not a medicine" response
        setError(L.notFound)
      }
    } catch (e) {
      setError(e.message || L.notFound)
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    // allow re-uploading the same file
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleReset() {
    setPreviewUrl(null)
    setResult(null)
    setError('')
  }

  function handleExplain() {
    if (result?.drug_name && onExplain) onExplain(result.drug_name)
  }

  const backendLabel = result?.ocr_backend === 'tesseract' ? L.local : L.cloud

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Upload zone (only when no preview) */}
      {!previewUrl && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-arm-red bg-arm-red/5' : 'border-warm-border'
          }`}
          style={{ minHeight: 320 }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="text-6xl mb-2" style={{ color: '#8B1A1A' }}>📷</div>
            <h3 className="font-playfair text-xl font-semibold text-warm-text">
              {L.title}
            </h3>
            <p className="font-plex text-sm text-warm-muted">{L.sub}</p>
            <p className="font-plex text-xs text-warm-muted mt-2 hidden md:block">
              {L.drag}
            </p>

            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <button
                type="button"
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                {L.choose}
              </button>
              <button
                type="button"
                className="btn-secondary md:hidden"
                onClick={() => cameraInputRef.current?.click()}
              >
                📸 {L.camera}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {/* Preview + loading state */}
      {previewUrl && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img
              src={previewUrl}
              alt="preview"
              className="rounded-lg border border-warm-border max-w-[180px] max-h-[180px] object-cover"
            />
            <div className="flex-1">
              {loading && (
                <div className="flex items-center gap-3 text-warm-muted">
                  <div className="w-5 h-5 border-2 border-arm-red border-t-transparent rounded-full animate-spin" />
                  <span className="font-plex">{L.analyzing}</span>
                </div>
              )}
              {!loading && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary text-sm"
                >
                  ↺ {L.retry}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg border px-4 py-3"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
        >
          <p className="font-plex text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result card */}
      {result?.found && (
        <div className="card border-2" style={{ borderColor: '#8B1A1A' }}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-warm-border">
            <span className="text-2xl">📷</span>
            <p className="font-plex text-xs uppercase tracking-wide text-warm-muted">
              {L.scanned}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-playfair text-2xl font-bold text-warm-text">
                {result.drug_name || '—'}
              </h3>
              {result.dosage_strength && (
                <span className="font-plex text-sm font-medium text-arm-red bg-arm-red/10 px-2 py-0.5 rounded">
                  {result.dosage_strength}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-plex">
              {result.dosage_form && (
                <div><span className="text-warm-muted">{L.form}:</span> <span className="text-warm-text font-medium">{result.dosage_form}</span></div>
              )}
              {result.manufacturer && (
                <div><span className="text-warm-muted">{L.manufacturer}:</span> <span className="text-warm-text font-medium">{result.manufacturer}</span></div>
              )}
              {result.active_ingredient && (
                <div className="sm:col-span-2"><span className="text-warm-muted">{L.ingredient}:</span> <span className="text-warm-text font-medium">{result.active_ingredient}</span></div>
              )}
              {result.expiry_date && (
                <div><span className="text-warm-muted">{L.expires}:</span> <span className="text-warm-text font-medium">{result.expiry_date}</span></div>
              )}
            </div>

            {result.warnings_text && result.warnings_text.length > 0 && (
              <div>
                <p className="font-plex text-xs uppercase tracking-wide text-warm-muted mb-1">
                  {L.warnings}
                </p>
                <ul className="space-y-0.5">
                  {result.warnings_text.map((w, i) => (
                    <li key={i} className="font-plex text-sm text-warm-text">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.instructions_text && (
              <div>
                <p className="font-plex text-xs uppercase tracking-wide text-warm-muted mb-1">
                  {L.instructions}
                </p>
                <p className="font-plex text-sm text-warm-text">{result.instructions_text}</p>
              </div>
            )}
          </div>

          {result.drug_name && (
            <button
              type="button"
              onClick={handleExplain}
              className="btn-primary w-full mt-5"
            >
              {L.explainBtn}
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs font-plex text-warm-muted">
        {result?.ocr_backend ? backendLabel : (LABELS[language]?.cloud || LABELS.en.cloud)}
      </p>
    </div>
  )
}
