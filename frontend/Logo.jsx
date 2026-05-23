// Aybolit logo: horizontal pill with a dark left half (Armenian wave
// ornament in red) and white right half (rounded pharmacy cross in red).
const AybolitLogo = ({ width = 160, className = "" }) => (
  <svg
    width={width}
    viewBox="0 0 480 200"
    role="img"
    aria-label="Aybolit logo"
    className={className}
  >
    <defs>
      <clipPath id="aybolit-left-clip">
        <path d="M40,100 a80,80 0 0,1 80,-80 l120,0 l0,160 l-120,0 a80,80 0 0,1 -80,-80 Z" />
      </clipPath>
    </defs>

    {/* Left dark half */}
    <path
      d="M40,100 a80,80 0 0,1 80,-80 l120,0 l0,160 l-120,0 a80,80 0 0,1 -80,-80 Z"
      fill="#1A1917"
    />

    {/* Armenian wave ornament — Armenian red */}
    <g clipPath="url(#aybolit-left-clip)" opacity="0.9">
      <path
        d="M44,100 Q94,44 144,100 Q194,156 244,100 Q284,44 324,100"
        fill="none"
        stroke="#8B1A1A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44,76 Q94,20 144,76 Q194,132 244,76 Q284,20 324,76"
        fill="none"
        stroke="#8B1A1A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M44,124 Q94,68 144,124 Q194,180 244,124 Q284,68 324,124"
        fill="none"
        stroke="#8B1A1A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="94" cy="52" rx="7" ry="13" fill="#8B1A1A" transform="rotate(-30,94,52)" />
      <ellipse cx="194" cy="148" rx="7" ry="13" fill="#8B1A1A" transform="rotate(30,194,148)" />
      <ellipse cx="144" cy="100" rx="5" ry="9" fill="#8B1A1A" />
      <circle cx="64" cy="88" r="4" fill="#8B1A1A" />
      <circle cx="224" cy="88" r="4" fill="#8B1A1A" />
      <circle cx="114" cy="116" r="3" fill="#8B1A1A" />
      <circle cx="174" cy="84" r="3" fill="#8B1A1A" />
    </g>

    {/* Right white half */}
    <path d="M240,20 l80,0 a80,80 0 0,1 0,160 l-80,0 Z" fill="#FAFAF9" />

    {/* Full pill outline */}
    <path
      d="M40,100 a80,80 0 0,1 80,-80 l200,0 a80,80 0 0,1 0,160 l-200,0 a80,80 0 0,1 -80,-80 Z"
      fill="none"
      stroke="#E8E6E1"
      strokeWidth="2"
    />

    {/* Divider */}
    <line x1="240" y1="20" x2="240" y2="180" stroke="#E8E6E1" strokeWidth="1.5" />

    {/* Pharmacy cross — Armenian red, rounded arms */}
    <rect x="308" y="56" width="16" height="88" rx="8" fill="#8B1A1A" />
    <rect x="264" y="84" width="104" height="16" rx="8" fill="#8B1A1A" />
  </svg>
)

export default AybolitLogo
