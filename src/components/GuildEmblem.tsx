import { useId } from 'react'

const SHIELD = 'M120 10 L212 40 V130 C212 198 172 244 120 270 C68 244 28 198 28 130 V40 Z'
const NAVY = '#101D38'
const GOLD = '#C9A24B'
const BONE = '#E9E2CF'
const RED = '#B3263E'
const CYAN = '#39C3D6'

/** The Guardians of the Grid shield: the guild castle on the grid, under a clock-face of stars. */
export function GuildEmblem({ className = '', title = 'Guardians of the Grid' }: { className?: string; title?: string }) {
  // Unique ids: the emblem can be on the page more than once.
  const id = useId().replace(/:/g, '')
  const clip = `shield-${id}`
  const glitchA = `glitch-a-${id}`
  const glitchB = `glitch-b-${id}`
  const castle = `castle-${id}`

  return (
    <svg viewBox="0 0 240 280" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={clip}>
          <path d={SHIELD} />
        </clipPath>
        <clipPath id={glitchA}>
          <rect x="0" y="120" width="240" height="7" />
        </clipPath>
        <clipPath id={glitchB}>
          <rect x="0" y="152" width="240" height="5" />
        </clipPath>
      </defs>
      <path d={SHIELD} fill={NAVY} />
      <g clipPath={`url(#${clip})`}>
        {/* Stars */}
        <g fill={BONE} opacity="0.8">
          <circle cx="58" cy="64" r="1.4" />
          <circle cx="184" cy="70" r="1.2" />
          <circle cx="76" cy="92" r="1" />
          <circle cx="168" cy="96" r="1.4" />
          <circle cx="96" cy="44" r="1" />
          <circle cx="150" cy="52" r="1.2" />
          <circle cx="48" cy="110" r="1.2" />
          <circle cx="194" cy="120" r="1" />
        </g>
        {/* Clock face */}
        <g fill="none" stroke={GOLD}>
          <circle cx="120" cy="118" r="70" strokeWidth="1.6" />
          <circle cx="120" cy="118" r="55" strokeWidth="0.8" strokeDasharray="2 3" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6
            const big = i % 3 === 0
            const r1 = big ? 60 : 63
            const r2 = 70
            return (
              <line
                key={i}
                x1={120 + Math.sin(a) * r1}
                y1={118 - Math.cos(a) * r1}
                x2={120 + Math.sin(a) * r2}
                y2={118 - Math.cos(a) * r2}
                strokeWidth={big ? 2 : 1.2}
              />
            )
          })}
        </g>
        {/* The grid */}
        <rect x="0" y="176" width="240" height="110" fill="#0A1328" />
        <g stroke={CYAN} strokeWidth="0.9" fill="none" opacity="0.75">
          <path d={Array.from({ length: 15 }, (_, i) => `M120 176 L${-90 + i * 30} 290`).join(' ')} />
          <path d="M0 180 H240 M0 187 H240 M0 197 H240 M0 213 H240 M0 238 H240" />
        </g>
        <line x1="0" y1="176" x2="240" y2="176" stroke={CYAN} strokeWidth="1.6" />
        {/* Castle */}
        <g id={castle} fill={BONE}>
          <rect x="50" y="146" width="140" height="30" />
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={50 + i * 10} y="140" width="5" height="7" />
          ))}
          <rect x="70" y="116" width="22" height="60" />
          <rect x="70" y="108" width="4" height="8" />
          <rect x="79" y="108" width="4" height="8" />
          <rect x="88" y="108" width="4" height="8" />
          <rect x="148" y="116" width="22" height="60" />
          <rect x="148" y="108" width="4" height="8" />
          <rect x="157" y="108" width="4" height="8" />
          <rect x="166" y="108" width="4" height="8" />
          <rect x="100" y="90" width="40" height="86" />
          <path d="M94 92 L120 50 L146 92 Z" fill={RED} />
          <path d="M70 116 L81 96 L92 116 Z" fill={RED} />
          <path d="M148 116 L159 96 L170 116 Z" fill={RED} />
          <path d="M120 50 V30" stroke={BONE} strokeWidth="2" />
          <path d="M120 30 L140 36 L120 42 Z" fill={GOLD} />
          <g fill={NAVY}>
            <path d="M116 114 V102 a4 4 0 0 1 8 0 V114 Z" />
            <path d="M116 140 V128 a4 4 0 0 1 8 0 V140 Z" />
            <rect x="79" y="128" width="4" height="14" />
            <rect x="157" y="128" width="4" height="14" />
            <path d="M108 176 V158 a12 12 0 0 1 24 0 V176 Z" />
          </g>
          <g stroke={GOLD} strokeWidth="1.2">
            <path d="M114 176 V152 M120 176 V146 M126 176 V152 M108 164 H132 M108 171 H132" />
          </g>
        </g>
        {/* Glitch: slices of the castle shifted sideways */}
        <g clipPath={`url(#${glitchA})`}>
          <use href={`#${castle}`} x="10" />
        </g>
        <g clipPath={`url(#${glitchB})`}>
          <use href={`#${castle}`} x="-8" />
        </g>
        <g>
          <rect x="66" y="120" width="30" height="1.6" fill={CYAN} />
          <rect x="150" y="125.4" width="40" height="1.6" fill={RED} />
          <rect x="172" y="132" width="12" height="4" fill={RED} />
          <rect x="186" y="132" width="5" height="4" fill={CYAN} />
          <rect x="52" y="158" width="14" height="3" fill={CYAN} />
          <rect x="40" y="158" width="6" height="3" fill={RED} />
          <rect x="30" y="100" width="8" height="3" fill={RED} />
          <rect x="198" y="96" width="6" height="3" fill={CYAN} />
        </g>
      </g>
      <path d="M120 22 L200 48 V130 C200 190 165 232 120 256 C75 232 40 190 40 130 V48 Z" fill="none" stroke={GOLD} strokeWidth="1.4" opacity="0.9" />
      <path d={SHIELD} fill="none" stroke={GOLD} strokeWidth="5" strokeLinejoin="round" />
      <path d="M120 4 V14 M30 38 L24 40 M210 38 L216 40" stroke={GOLD} strokeWidth="2" fill="none" />
    </svg>
  )
}
