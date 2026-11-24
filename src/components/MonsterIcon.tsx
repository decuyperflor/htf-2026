import { MonsterBody } from '#/components/battlefield/MonsterBody.tsx'

/** A still picture of a monster from the index, for lists and cards. */
/** A monster's portrait; a glowing question mark while nobody knows which monster it is (scouting). */
export function MonsterIcon({ monsterId, className = 'size-8' }: { monsterId: string | null; className?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden="true">
      {monsterId ? <MonsterBody monsterId={monsterId} r={38} t={0} /> : <UnknownMark />}
    </svg>
  )
}

function UnknownMark() {
  return (
    <g>
      <circle r={34} fill="#39C3D6" opacity={0.18} />
      <circle r={26} fill="none" stroke="#39C3D6" strokeWidth={2} strokeDasharray="4 5" />
      <text y={17} textAnchor="middle" fontSize={52} fontWeight={900} fontFamily="Cinzel, Georgia, serif" fill="#E9E2CF">
        ?
      </text>
    </g>
  )
}

export function DangerStars({ danger }: { danger: number }) {
  return (
    <span className="tracking-tight text-[#C9A24B]" aria-label={`Danger ${danger} of 5`} title={`Danger ${danger}/5`}>
      {'★'.repeat(danger)}
      <span className="text-line">{'★'.repeat(5 - danger)}</span>
    </span>
  )
}
