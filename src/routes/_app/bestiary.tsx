import { createFileRoute } from '@tanstack/react-router'
import { DangerStars, MonsterIcon } from '#/components/MonsterIcon.tsx'
import { getMonsters } from '#/lib/monsters.functions.ts'

export const Route = createFileRoute('/_app/bestiary')({
  loader: () => getMonsters(),
  head: () => ({ meta: [{ title: 'Bestiary · Achrona Guild' }] }),
  component: BestiaryPage,
})

function BestiaryPage() {
  const monsters = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-fg">Bestiary</h1>
        <p className="mt-2 text-muted">
          Every monster the Desync has sent so far. The more dangerous, the bigger it gets on the frontier –
          and every extra sighting makes it grow.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {monsters.map((m) => (
          <li key={m.monsterId} className="flex gap-4 rounded-2xl border border-line p-5">
            <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-[#120c2e]">
              <MonsterIcon monsterId={m.monsterId} className="size-20" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-fg">{m.name}</h2>
              <DangerStars danger={m.danger} />
              <p className="text-sm text-muted">{m.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
