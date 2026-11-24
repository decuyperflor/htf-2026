import { Sparkles } from 'lucide-react'
import { magicMood } from '#/lib/magic.ts'

const R = 40
const ARC = Math.PI * R

/** Half-round meter: how much magic Achrona has left. Fixed parchment colours, so it reads on the map too. */
export function MagicGauge({ level, className = '' }: { level: number; className?: string }) {
  const mood = magicMood(level)
  const angle = -90 + (level / 100) * 180

  return (
    <div
      role="meter"
      aria-label="Magic of Achrona"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={level}
      aria-valuetext={`${level}% – ${mood.label}`}
      className={`flex items-center gap-3 rounded-2xl border-2 border-[#2b2340] bg-[#fffaf0] px-3 py-2 text-[#2b2340] shadow-md ${className}`}
    >
      <svg viewBox="0 0 100 56" className="h-14 w-24 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="magic-track" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#d7263d" />
            <stop offset="35%" stopColor="#e0702e" />
            <stop offset="65%" stopColor="#e0a526" />
            <stop offset="100%" stopColor="#7b5cff" />
          </linearGradient>
        </defs>
        {/* Faint full scale, then the remaining magic on top */}
        <path d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`} fill="none" stroke="url(#magic-track)" strokeOpacity={0.22} strokeWidth={9} strokeLinecap="round" />
        <path
          d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`}
          fill="none"
          stroke="url(#magic-track)"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={ARC}
          strokeDashoffset={ARC * (1 - level / 100)}
          style={{ transition: 'stroke-dashoffset 900ms ease' }}
        />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50px 50px', transition: 'transform 900ms ease' }}>
          <path d="M 50 50 L 48 47 L 50 16 L 52 47 Z" fill="#2b2340" />
        </g>
        <circle cx={50} cy={50} r={4.5} fill="#2b2340" />
        <circle cx={50} cy={50} r={1.8} fill={mood.color} />
      </svg>
      <div className="leading-tight">
        <p className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-[#2b2340]/60 uppercase">
          <Sparkles className="size-3" /> Magic of Achrona
        </p>
        <p className="text-2xl font-black" style={{ color: mood.color }}>
          {level}%
        </p>
        <p className="text-xs font-semibold">{mood.label}</p>
      </div>
    </div>
  )
}
