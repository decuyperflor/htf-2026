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
      className={`flex items-center gap-3 rounded-sm border border-[#C9A24B] bg-[#FAF7EF] px-3 py-2 text-[#101D38] shadow-[inset_0_0_0_3px_#FAF7EF,inset_0_0_0_4px_rgb(201_162_75/0.5),0_4px_12px_rgb(10_19_40/0.3)] ${className}`}
    >
      <svg viewBox="0 0 100 56" className="h-14 w-24 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="magic-track" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#B3263E" />
            <stop offset="35%" stopColor="#9A4A1F" />
            <stop offset="65%" stopColor="#C9A24B" />
            <stop offset="100%" stopColor="#39C3D6" />
          </linearGradient>
        </defs>
        {/* Engraved scale: rim, ticks every 10%, then the remaining magic on top */}
        <path d={`M ${50 - R - 6} 50 A ${R + 6} ${R + 6} 0 0 1 ${50 + R + 6} 50`} fill="none" stroke="#C9A24B" strokeWidth={0.8} />
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI - (i / 10) * Math.PI
          const r1 = i % 5 === 0 ? R - 9 : R - 7
          return (
            <line
              key={i}
              x1={(50 + Math.cos(a) * r1).toFixed(2)}
              y1={(50 - Math.sin(a) * r1).toFixed(2)}
              x2={(50 + Math.cos(a) * (R - 5)).toFixed(2)}
              y2={(50 - Math.sin(a) * (R - 5)).toFixed(2)}
              stroke="#101D38"
              strokeWidth={i % 5 === 0 ? 1.2 : 0.6}
            />
          )
        })}
        <path d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`} fill="none" stroke="#101D38" strokeOpacity={0.12} strokeWidth={7} />
        <path
          d={`M ${50 - R} 50 A ${R} ${R} 0 0 1 ${50 + R} 50`}
          fill="none"
          stroke="url(#magic-track)"
          strokeWidth={7}
          strokeDasharray={ARC}
          strokeDashoffset={ARC * (1 - level / 100)}
          style={{ transition: 'stroke-dashoffset 900ms ease' }}
        />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50px 50px', transition: 'transform 900ms ease' }}>
          <path d="M 50 50 L 48 47 L 50 16 L 52 47 Z" fill="#101D38" />
        </g>
        <circle cx={50} cy={50} r={4.5} fill="#101D38" stroke="#C9A24B" strokeWidth={1} />
        <circle cx={50} cy={50} r={1.8} fill={mood.color} />
      </svg>
      <div className="leading-tight">
        <p className="flex items-center gap-1 font-display text-[11px] font-bold tracking-wider text-[#4A5675] uppercase">
          <Sparkles className="size-3" /> Magic of Achrona
        </p>
        <p className="font-display text-2xl font-bold" style={{ color: mood.color }}>
          {level}%
        </p>
        <p className="text-xs font-semibold">{mood.label}</p>
      </div>
    </div>
  )
}
