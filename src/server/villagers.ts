// Server-only: villagers of Achrona report strange things by themselves (echoes without a guardian).
// Enough reports at one place in a short time open a scouting quest.
import { and, eq, gte, isNull, ne, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, locations } from '#/db/schema.ts'
import { formatGlitchId } from '#/lib/glitch.ts'
import type { Tx } from '#/server/quests.ts'

/** A new villager report every so often (fast, for the demo). */
const REPORT_EVERY_MS = 20_000
/** This many loose reports at one place … */
export const CLUSTER_SIZE = 3
/** … within this window open a scouting quest. */
const CLUSTER_WINDOW_MS = 10 * 60_000

const VILLAGERS = [
  'Maud the baker',
  'Old Tom, fisherman',
  'Little Pip',
  'Granny Willow',
  'Bram the blacksmith',
  'Sister Elowen',
  'Farmer Odo',
  'Nell the milkmaid',
  'Captain Rook',
  'Tilda the weaver',
  'Hob the shepherd',
  'Merrin the innkeeper',
  'Young Fen',
  'Ada the herbalist',
  'Gus the gravedigger',
  'Wren the courier',
]

const REPORTS = [
  'A child went missing near {place} this morning',
  'The church bell near {place} struck 13 times',
  'Our cows near {place} are giving blue milk',
  'Strange green lights dance around {place} at night',
  'My shadow stayed behind at {place}',
  'Every clock at {place} runs backwards',
  'Footprints at {place} that walk away from nowhere',
  'Something big growled under {place}',
  'Bread baked near {place} came out of the oven raw again',
  'The well at {place} whispers my name',
  'Birds fly upside down above {place}',
  'I walked past {place} and lost an hour',
  'Sheep near {place} keep vanishing one by one',
  'A cold wind blows only around {place}',
  'The flowers at {place} wilted in a heartbeat',
  'Coins in my purse turned to pebbles at {place}',
  'Heard heavy footsteps at {place}, but saw no one',
  'The lanterns at {place} burn with black flames',
  'My reflection at {place} winked at me',
  'Rain at {place} falls upwards',
  'A trail of slime leads to {place}',
  'The road to {place} keeps getting longer',
]

let lastReport = 0

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

/** Called while the app polls: a villager reports something every REPORT_EVERY_MS. */
export function villagerTick() {
  const now = Date.now()
  if (now - lastReport < REPORT_EVERY_MS) return
  lastReport = now
  db.transaction((tx) => {
    const locationId = chooseLocation(tx)
    if (locationId) addVillagerReport(tx, locationId)
  })
}

/** Guild master's demo button: villagers flood one quiet place with reports, opening a scouting quest. */
export function summonVillagerReports() {
  return db.transaction((tx) => {
    const quiet = quietLocations(tx)
    if (!quiet.length) throw new Error('Every place already has a quest – slay some monsters first!')
    const locationId = pick(quiet)
    let glitchId: string | null = null
    for (let i = 0; i < CLUSTER_SIZE; i++) glitchId = addVillagerReport(tx, locationId) ?? glitchId
    return { locationId, glitchId }
  })
}

/** Places without a quest that is still open. */
function quietLocations(tx: Tx) {
  const busy = new Set(
    tx
      .select({ locationId: glitches.locationId })
      .from(glitches)
      .where(ne(glitches.status, 'FIXED'))
      .all()
      .map((g) => g.locationId),
  )
  return tx
    .select({ locationId: locations.locationId })
    .from(locations)
    .all()
    .map((l) => l.locationId)
    .filter((id) => !busy.has(id))
}

/** Mostly a place that already has loose reports (so rumours pile up), sometimes a new one. */
function chooseLocation(tx: Tx) {
  const since = new Date(Date.now() - CLUSTER_WINDOW_MS).toISOString()
  const rumours = tx
    .select({ locationId: echoes.locationId })
    .from(echoes)
    .where(and(isNull(echoes.glitchId), gte(echoes.timestamp, since)))
    .all()
    .map((e) => e.locationId)
    .filter((id): id is string => Boolean(id))
  if (rumours.length && Math.random() < 0.6) return pick(rumours)
  const quiet = quietLocations(tx)
  return quiet.length ? pick(quiet) : null
}

/**
 * One villager report at a place. If a quest is already open there, it joins that quest;
 * otherwise it stays loose until enough reports pile up and a scouting quest opens.
 * Returns the glitch it ended up in (if any).
 */
function addVillagerReport(tx: Tx, locationId: string) {
  const location = tx.select().from(locations).where(eq(locations.locationId, locationId)).get()
  if (!location) return null
  const timestamp = new Date().toISOString()
  const open = tx
    .select({ glitchId: glitches.glitchId })
    .from(glitches)
    .where(and(eq(glitches.locationId, locationId), ne(glitches.status, 'FIXED')))
    .get()

  const description = pick(REPORTS).replace('{place}', location.name)
  tx.insert(echoes)
    .values({ glitchId: open?.glitchId ?? null, locationId, description, timestamp, reporterName: pick(VILLAGERS) })
    .run()
  if (open) return open.glitchId

  const since = new Date(Date.now() - CLUSTER_WINDOW_MS).toISOString()
  const loose = tx
    .select({ echoId: echoes.echoId, description: echoes.description })
    .from(echoes)
    .where(and(isNull(echoes.glitchId), eq(echoes.locationId, locationId), gte(echoes.timestamp, since)))
    .orderBy(echoes.timestamp)
    .all()
  if (loose.length < CLUSTER_SIZE) return null

  const glitchId = nextGlitchId(tx)
  tx.insert(glitches)
    .values({
      glitchId,
      status: 'LEAKED',
      monsterId: null,
      locationId,
      description: `Villagers report strange things at ${location.name}: “${loose[0].description}”`,
      timestamp,
    })
    .run()
  tx.update(echoes)
    .set({ glitchId })
    .where(and(isNull(echoes.glitchId), eq(echoes.locationId, locationId)))
    .run()
  return glitchId
}

/** Next number after the highest existing 'GL-xxxx'. */
export function nextGlitchId(tx: Tx) {
  const { maxNo } = tx
    .select({ maxNo: sql<number>`coalesce(max(cast(substr(${glitches.glitchId}, 4) as integer)), 0)` })
    .from(glitches)
    .get()!
  return formatGlitchId(maxNo + 1)
}
