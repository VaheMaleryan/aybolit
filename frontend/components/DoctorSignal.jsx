// Minimal single-line doctor signal with a left-border accent only.
// No background tint, no emoji, no pulse.
const SIGNALS = {
  routine: {
    border: '#2D6A4F',
    text: {
      hy: 'Սովորական — բժշկի այցելություն չի պահանջվում',
      ru: 'Обычное — визит к врачу не требуется',
      en: 'Routine — no doctor visit needed',
    },
  },
  monitor: {
    border: '#B45309',
    text: {
      hy: 'Հետևեք ձեր ախտանիշերին',
      ru: 'Следите за симптомами',
      en: 'Monitor — watch your symptoms',
    },
  },
  call_doctor: {
    border: '#C2410C',
    text: {
      hy: 'Պետք է դիմել բժշկի',
      ru: 'Обратитесь к врачу',
      en: 'Consult a doctor',
    },
  },
  emergency: {
    border: '#991B1B',
    text: {
      hy: 'Անհապաղ դիմեք բժշկի',
      ru: 'Немедленно обратитесь к врачу',
      en: 'Seek medical attention now',
    },
  },
}

export default function DoctorSignal({ signal, reason, language }) {
  const cfg = SIGNALS[signal] || SIGNALS.routine
  const label = cfg.text[language] || cfg.text.en
  return (
    <div className="card-min" style={{ borderLeft: `3px solid ${cfg.border}` }}>
      <p className="font-plex text-warm-text" style={{ fontSize: 14, fontWeight: 500 }}>
        {label}
      </p>
      {reason && (
        <p
          className="font-plex text-warm-muted mt-1.5"
          style={{ fontSize: 13, lineHeight: 1.55 }}
        >
          {reason}
        </p>
      )}
    </div>
  )
}
