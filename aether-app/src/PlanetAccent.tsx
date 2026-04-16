type PlanetType = 'gas-giant' | 'blue-marble' | 'dusty-red'

type PlanetAccentProps = {
  type: PlanetType
  size?: number
  style?: React.CSSProperties
  className?: string
}

const floatKeyframes = `
@keyframes planet-float-a {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-18px) rotate(2deg); }
}
@keyframes planet-float-b {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-12px) rotate(-1.5deg); }
  66% { transform: translateY(8px) rotate(1deg); }
}
@keyframes planet-float-c {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  40% { transform: translateY(-20px) rotate(3deg); }
  80% { transform: translateY(6px) rotate(-1deg); }
}
`

function GasGiant({ size }: { size: number }) {
  const r = size / 2
  return (
    <svg width={size * 1.7} height={size} viewBox={`0 0 ${size * 1.7} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gg-body" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4B8FFF" />
          <stop offset="35%" stopColor="#2563EB" />
          <stop offset="70%" stopColor="#1E3A7A" />
          <stop offset="100%" stopColor="#0A1040" />
        </radialGradient>
        <radialGradient id="gg-highlight" cx="30%" cy="25%" r="45%">
          <stop offset="0%" stopColor="rgba(165,210,255,0.35)" />
          <stop offset="100%" stopColor="rgba(165,210,255,0)" />
        </radialGradient>
        <ellipse id="gg-clip-el" cx={r * 1.7} cy={r} rx={r} ry={r} />
        <clipPath id="gg-clip">
          <use href="#gg-clip-el" />
        </clipPath>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(100,160,255,0)" />
          <stop offset="20%" stopColor="rgba(100,160,255,0.35)" />
          <stop offset="50%" stopColor="rgba(140,190,255,0.55)" />
          <stop offset="80%" stopColor="rgba(100,160,255,0.30)" />
          <stop offset="100%" stopColor="rgba(100,160,255,0)" />
        </linearGradient>
        {/* Atmosphere glow */}
        <radialGradient id="gg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="rgba(30,144,255,0)" />
          <stop offset="100%" stopColor="rgba(30,144,255,0.18)" />
        </radialGradient>
      </defs>
      {/* Atmosphere glow */}
      <ellipse cx={r * 1.7} cy={r} rx={r + 6} ry={r + 6} fill="url(#gg-glow)" />
      {/* Ring back */}
      <ellipse cx={r * 1.7} cy={r} rx={r * 1.65} ry={r * 0.22} stroke="url(#ring-grad)" strokeWidth="4" fill="none" opacity="0.7" />
      {/* Planet body */}
      <ellipse cx={r * 1.7} cy={r} rx={r} ry={r} fill="url(#gg-body)" />
      {/* Bands */}
      <g clipPath="url(#gg-clip)">
        <ellipse cx={r * 1.7} cy={r * 0.5} rx={r} ry={r * 0.1} fill="rgba(100,160,255,0.15)" />
        <ellipse cx={r * 1.7} cy={r * 0.75} rx={r} ry={r * 0.08} fill="rgba(60,120,220,0.20)" />
        <ellipse cx={r * 1.7} cy={r * 1.25} rx={r} ry={r * 0.10} fill="rgba(40,90,180,0.18)" />
        <ellipse cx={r * 1.7} cy={r * 1.55} rx={r} ry={r * 0.07} fill="rgba(80,140,240,0.12)" />
      </g>
      {/* Highlight */}
      <ellipse cx={r * 1.7} cy={r} rx={r} ry={r} fill="url(#gg-highlight)" />
      {/* Ring front (over planet) */}
      <ellipse cx={r * 1.7} cy={r} rx={r * 1.65} ry={r * 0.22} stroke="url(#ring-grad)" strokeWidth="3" fill="none" opacity="0.45"
        strokeDasharray={`${Math.PI * r * 1.65 * 0.5} ${Math.PI * r * 1.65 * 0.5}`}
        strokeDashoffset={Math.PI * r * 1.65 * 0.25}
      />
    </svg>
  )
}

function BlueMarble({ size }: { size: number }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bm-body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5DB8FF" />
          <stop offset="40%" stopColor="#1565C0" />
          <stop offset="80%" stopColor="#0A2E6A" />
          <stop offset="100%" stopColor="#060F2E" />
        </radialGradient>
        <radialGradient id="bm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="68%" stopColor="rgba(30,144,255,0)" />
          <stop offset="100%" stopColor="rgba(30,144,255,0.22)" />
        </radialGradient>
        <radialGradient id="bm-atmos" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(160,220,255,0.28)" />
          <stop offset="100%" stopColor="rgba(160,220,255,0)" />
        </radialGradient>
        <clipPath id="bm-clip">
          <circle cx={r} cy={r} r={r} />
        </clipPath>
      </defs>
      <circle cx={r} cy={r} r={r + 5} fill="url(#bm-glow)" />
      <circle cx={r} cy={r} r={r} fill="url(#bm-body)" />
      <g clipPath="url(#bm-clip)">
        {/* Continent-like patches */}
        <ellipse cx={r * 0.7} cy={r * 0.65} rx={r * 0.35} ry={r * 0.22} fill="rgba(40, 160, 80, 0.45)" transform={`rotate(-20 ${r} ${r})`} />
        <ellipse cx={r * 1.3} cy={r * 1.2} rx={r * 0.28} ry={r * 0.16} fill="rgba(50, 140, 70, 0.35)" transform={`rotate(10 ${r} ${r})`} />
        {/* Clouds */}
        <ellipse cx={r * 0.8} cy={r * 0.45} rx={r * 0.45} ry={r * 0.07} fill="rgba(255,255,255,0.18)" />
        <ellipse cx={r * 1.25} cy={r * 0.85} rx={r * 0.38} ry={r * 0.06} fill="rgba(255,255,255,0.14)" />
      </g>
      <circle cx={r} cy={r} r={r} fill="url(#bm-atmos)" />
    </svg>
  )
}

function DustyRed({ size }: { size: number }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dr-body" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#D4704A" />
          <stop offset="40%" stopColor="#8B3A1E" />
          <stop offset="80%" stopColor="#4A1A0A" />
          <stop offset="100%" stopColor="#200800" />
        </radialGradient>
        <radialGradient id="dr-glow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="rgba(192,80,32,0)" />
          <stop offset="100%" stopColor="rgba(192,80,32,0.20)" />
        </radialGradient>
        <radialGradient id="dr-highlight" cx="30%" cy="25%" r="50%">
          <stop offset="0%" stopColor="rgba(255,180,120,0.20)" />
          <stop offset="100%" stopColor="rgba(255,180,120,0)" />
        </radialGradient>
        <clipPath id="dr-clip">
          <circle cx={r} cy={r} r={r} />
        </clipPath>
      </defs>
      <circle cx={r} cy={r} r={r + 4} fill="url(#dr-glow)" />
      <circle cx={r} cy={r} r={r} fill="url(#dr-body)" />
      <g clipPath="url(#dr-clip)">
        <ellipse cx={r * 1.1} cy={r * 0.9} rx={r * 0.55} ry={r * 0.14} fill="rgba(100,40,10,0.45)" transform={`rotate(-15 ${r} ${r})`} />
        <ellipse cx={r * 0.8} cy={r * 1.3} rx={r * 0.42} ry={r * 0.10} fill="rgba(80,30,5,0.35)" />
        <circle cx={r * 0.55} cy={r * 0.55} r={r * 0.12} fill="rgba(60,20,5,0.50)" />
      </g>
      <circle cx={r} cy={r} r={r} fill="url(#dr-highlight)" />
    </svg>
  )
}

function PlanetAccent({ type, size = 80, style, className }: PlanetAccentProps) {
  const animMap: Record<PlanetType, string> = {
    'gas-giant': 'planet-float-a 11s ease-in-out infinite',
    'blue-marble': 'planet-float-b 8.5s ease-in-out infinite',
    'dusty-red': 'planet-float-c 13s ease-in-out infinite',
  }

  return (
    <>
      <style>{floatKeyframes}</style>
      <div
        className={className}
        style={{
          display: 'inline-block',
          animation: animMap[type],
          filter: 'drop-shadow(0 0 12px rgba(30,144,255,0.15))',
          pointerEvents: 'none',
          userSelect: 'none',
          ...style,
        }}
        aria-hidden="true"
      >
        {type === 'gas-giant' && <GasGiant size={size} />}
        {type === 'blue-marble' && <BlueMarble size={size} />}
        {type === 'dusty-red' && <DustyRed size={size} />}
      </div>
    </>
  )
}

export default PlanetAccent
