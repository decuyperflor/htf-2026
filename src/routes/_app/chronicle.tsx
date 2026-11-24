import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Coins, Download, Skull, Trophy } from 'lucide-react'
import { DangerStars, MonsterIcon } from '#/components/MonsterIcon.tsx'
import { formatTimestamp } from '#/lib/format.ts'
import { questRank } from '#/lib/glitch.ts'
import { getChronicle } from '#/lib/report.functions.ts'

export const Route = createFileRoute('/_app/chronicle')({
  loader: () => getChronicle(),
  head: () => ({ meta: [{ title: 'Chronicle of slain monsters · Achrona Guild' }] }),
  component: ChroniclePage,
})

/** Print dialog → "Save as PDF"; the file name follows the document title. */
function downloadPdf() {
  const previous = document.title
  document.title = `Achrona-chronicle-${new Date().toISOString().slice(0, 10)}`
  window.print()
  document.title = previous
}

function ChroniclePage() {
  const entries = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()

  const totalGold = entries.reduce((sum, e) => sum + e.party.reduce((s, p) => s + p.gold, 0), 0)
  const slayers = new Map<string, { gold: number; slain: number }>()
  for (const e of entries) {
    for (const p of e.party) {
      const s = slayers.get(p.codename) ?? { gold: 0, slain: 0 }
      slayers.set(p.codename, { gold: s.gold + p.gold, slain: s.slain + 1 })
    }
  }
  const ranking = [...slayers.entries()].sort((a, b) => b[1].gold - a[1].gold)

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-8 print:max-w-none print:gap-5 print:text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/quests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Quest board
        </Link>
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Download className="size-4" /> Download PDF
        </button>
      </div>

      <header className="flex flex-col gap-1 border-b-2 border-line pb-5">
        <p className="text-xs font-bold tracking-[0.2em] text-[#b8862f] uppercase">For the High Council of Achrona</p>
        <h1 className="text-3xl font-semibold text-fg">Chronicle of slain monsters</h1>
        <p className="text-sm text-muted">
          Drawn up by {guardian.codename} ({guardian.roleName}) on{' '}
          <time suppressHydrationWarning>{formatTimestamp(new Date().toISOString())}</time>
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 print:grid-cols-3">
        <Stat icon={<Skull className="size-5" />} label="Monsters slain" value={entries.length} />
        <Stat icon={<Coins className="size-5" />} label="Gold paid out" value={totalGold} />
        <Stat icon={<Trophy className="size-5" />} label="Top slayer" value={ranking[0]?.[0] ?? '–'} />
      </section>

      {ranking.length > 0 && (
        <section className="flex flex-col gap-2 break-inside-avoid">
          <h2 className="text-xl font-semibold text-fg">Rewards per adventurer</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-normal">Adventurer</th>
                <th className="py-2 font-normal">Monsters slain</th>
                <th className="py-2 text-right font-normal">Gold collected</th>
              </tr>
            </thead>
            <tbody className="text-fg">
              {ranking.map(([codename, s]) => (
                <tr key={codename} className="border-b border-line/60">
                  <td className="py-2 font-medium">{codename}</td>
                  <td className="py-2">{s.slain}</td>
                  <td className="py-2 text-right font-semibold text-[#b8862f]">{s.gold} gold</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">Quest log</h2>
        {entries.length === 0 && <p className="text-muted">No monsters have been slain yet.</p>}
        {entries.map((e) => {
          const gold = e.party.reduce((s, p) => s + p.gold, 0)
          return (
            <section key={e.glitchId} className="flex break-inside-avoid flex-col gap-3 rounded-2xl border border-line p-5 print:rounded-none print:p-3">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#120c2e] print:size-10">
                  <MonsterIcon monsterId={e.monsterId} className="size-10 print:size-8" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-fg">
                    {e.glitchId} · {e.monsterName} <DangerStars danger={e.monsterDanger} />
                  </h3>
                  <p className="text-sm text-muted">
                    {e.locationName}, {e.regionName} · Rank {questRank(e.locationDanger)}
                  </p>
                  <p className="text-fg">{e.description}</p>
                </div>
                <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-3 text-sm">
                  <dt className="text-muted">Spotted</dt>
                  <dd className="text-fg" suppressHydrationWarning>{formatTimestamp(e.spottedAt)}</dd>
                  <dt className="text-muted">Slain</dt>
                  <dd className="text-fg" suppressHydrationWarning>{e.slainAt ? formatTimestamp(e.slainAt) : '–'}</dd>
                </dl>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_14rem] print:grid-cols-[1fr_14rem]">
                <div>
                  <h4 className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Sightings ({e.sightings.length})</h4>
                  <ol className="flex flex-col gap-1 text-sm">
                    {e.sightings.map((s, i) => (
                      <li key={i} className="text-fg">
                        <span className="text-muted" suppressHydrationWarning>{formatTimestamp(s.timestamp)} · {s.reporter}:</span> {s.description}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Slain by</h4>
                  {e.party.length ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {e.party.map((p) => (
                        <li key={p.codename} className="flex justify-between gap-2 text-fg">
                          {p.codename} <span className="font-semibold text-[#b8862f]">{p.gold} gold</span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-2 border-t border-line pt-1 font-semibold text-fg">
                        Total <span className="text-[#b8862f]">{gold} gold</span>
                      </li>
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">The guild itself (no reward paid)</p>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </section>
    </article>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line p-4 print:p-2">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">{icon}</span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-xl font-semibold text-fg">{value}</p>
      </div>
    </div>
  )
}
