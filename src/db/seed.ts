import { db } from './index.ts'
import { glitches } from './schema.ts'

const rows: (typeof glitches.$inferInsert)[] = [
  { glitchId: 'GL-0142', status: 'LEAKED', description: 'Time loop detected near the eastern clock tower', timestamp: '2026-11-10T13:42:00Z' },
  { glitchId: 'GL-0141', status: 'ASSESSING', description: 'Magic reserves dropping faster than expected', timestamp: '2026-11-10T11:05:00Z' },
  { glitchId: 'GL-0139', status: 'CONTAINING', description: 'Portal flicker in the archive vaults', timestamp: '2026-11-09T22:17:00Z' },
  { glitchId: 'GL-0137', status: 'FIXED', description: 'Echo sensors reporting duplicate signals', timestamp: '2026-11-08T08:30:00Z' },
]

// Wipe and refill so the seed can be re-run safely.
db.transaction((tx) => {
  tx.delete(glitches).run()
  tx.insert(glitches).values(rows).run()
})

console.log(`Seeded ${rows.length} glitches.`)
