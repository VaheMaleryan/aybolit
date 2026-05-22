const SIGNAL_CONFIG = {
  routine: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✓',
    iconColor: 'text-green-600',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    badgeLabel: 'Routine medication',
    title: {
      hy: 'Սovoral բnakanutyan dex չi petvum',
      ru: 'Обычный визит к врачу не требуется',
      en: 'No immediate doctor visit needed',
    },
  },
  monitor: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '⚠',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    badgeLabel: 'Monitor symptoms',
    title: {
      hy: 'Hetevakel apelahardeq simptomere',
      ru: 'Следите за симптомами',
      en: 'Watch your symptoms',
    },
  },
  call_doctor: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    icon: '📞',
    iconColor: 'text-orange-600',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    badgeLabel: 'Consult doctor',
    title: {
      hy: 'Dardzred bjshki',
      ru: 'Обратитесь к врачу',
      en: 'Schedule a doctor visit',
    },
  },
  emergency: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    icon: '🚨',
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    badgeLabel: 'Seek medical attention',
    title: {
      hy: 'Anjin dardzred bjshki',
      ru: 'Немедленно обратитесь к врачу',
      en: 'Seek medical attention now',
    },
  },
}

export function SignalBadge({ signal }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.routine
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-plex font-medium ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span>{cfg.icon}</span>
      {cfg.badgeLabel}
    </span>
  )
}

export default function DoctorSignal({ signal, reason, language }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.routine
  const isEmergency = signal === 'emergency'

  return (
    <div className={`card ${cfg.bg} border-2 ${cfg.border} ${isEmergency ? 'emergency-pulse' : ''}`}>
      <div className="flex items-start gap-4">
        <span className={`text-3xl ${cfg.iconColor} mt-0.5`}>{cfg.icon}</span>
        <div className="flex-1">
          <h3 className="font-playfair text-xl font-semibold text-warm-text mb-1">
            {cfg.title[language] || cfg.title.en}
          </h3>
          {reason && (
            <p className="font-plex text-warm-muted text-sm mt-1">{reason}</p>
          )}
          <p className="font-plex text-warm-muted text-sm mt-3 italic border-t border-current border-opacity-20 pt-3">
            Կасκածи деpqum дijek bjшki — Всегда консультируйтесь с врачом при сомнениях
          </p>
        </div>
      </div>
    </div>
  )
}
