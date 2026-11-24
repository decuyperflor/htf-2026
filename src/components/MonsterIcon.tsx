import { MonsterBody } from '#/components/battlefield/MonsterBody.tsx'

/** A still picture of a monster from the index, for lists and cards. */
export function MonsterIcon({ monsterId, className = 'size-8' }: { monsterId: string; className?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden="true">
      <MonsterBody monsterId={monsterId} r={38} t={0} />
    </svg>
  )
}

export function DangerStars({ danger }: { danger: number }) {
  return (
    <span className="tracking-tight text-amber-500" aria-label={`Danger ${danger} of 5`} title={`Danger ${danger}/5`}>
      {'★'.repeat(danger)}
      <span className="text-line">{'★'.repeat(5 - danger)}</span>
    </span>
  )
}
