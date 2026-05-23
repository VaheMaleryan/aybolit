const SIGNAL_CONFIG = {
  routine: {
    bg: 'bg-white',
    leftBorder: '#16a34a', // green-600
    icon: '✓',
    iconColor: 'text-green-600',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    badgeLabel: {
      hy: 'Սովորական դեղամիջոց',
      ru: 'Обычное лекарство',
      en: 'Routine medication',
    },
    title: {
      hy: 'Բժշկի այցելություն չի պահանջվում',
      ru: 'Визит к врачу не требуется',
      en: 'No immediate doctor visit needed',
    },
  },
  monitor: {
    bg: 'bg-amber-50/50',
    leftBorder: '#d97706', // amber-600
    icon: '⚠',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    badgeLabel: {
      hy: 'Հետևեք ախտանիշերին',
      ru: 'Следите за симптомами',
      en: 'Monitor symptoms',
    },
    title: {
      hy: 'Հետևեք ձեր ախտանիշերին',
      ru: 'Следите за симптомами',
      en: 'Watch your symptoms',
    },
  },
  call_doctor: {
    bg: 'bg-orange-50',
    leftBorder: '#ea580c', // orange-600
    icon: '📞',
    iconColor: 'text-orange-600',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    badgeLabel: {
      hy: 'Դիմեք բժշկի',
      ru: 'Обратитесь к врачу',
      en: 'Consult doctor',
    },
    title: {
      hy: 'Պետք է դիմել բժշկի',
      ru: 'Обратитесь к врачу',
      en: 'Schedule a doctor visit',
    },
  },
  emergency: {
    bg: 'bg-red-50',
    leftBorder: '#dc2626', // red-600
    icon: '🚨',
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    badgeLabel: {
      hy: 'Շտապ բուժօգնություն',
      ru: 'Срочная медпомощь',
      en: 'Seek medical attention',
    },
    title: {
      hy: 'Անհապաղ դիմեք բժշկի',
      ru: 'Немедленно обратитесь к врачу',
      en: 'Seek medical attention now',
    },
  },
}

export function SignalBadge({ signal, language = 'en' }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.routine
  const label = cfg.badgeLabel[language] || cfg.badgeLabel.en
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-plex font-medium ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span>{cfg.icon}</span>
      {label}
    </span>
  )
}

export default function DoctorSignal({ signal, reason, language }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.routine
  const isEmergency = signal === 'emergency'

  return (
    <div
      className={`card ${cfg.bg} ${isEmergency ? 'emergency-pulse' : ''}`}
      style={{ borderLeft: `4px solid ${cfg.leftBorder}` }}
    >
      <div className="flex items-start gap-4">
        <span className={`text-3xl ${cfg.iconColor} mt-0.5`}>{cfg.icon}</span>
        <div className="flex-1">
          <h3 className="font-playfair text-xl font-semibold text-warm-text mb-1">
            {cfg.title[language] || cfg.title.en}
          </h3>
          {reason && (
            <p className="font-plex text-warm-muted text-sm mt-1">{reason}</p>
          )}
          <p className="font-plex text-warm-muted text-sm mt-3 italic border-t border-warm-border pt-3">
            Կասկածի դեպքում դիմեք բժշկի — При сомнениях обратитесь к врачу
          </p>
        </div>
      </div>
    </div>
  )
}
