import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import {
  bounties,
  echoes,
  glitchAssignments,
  glitches,
  guardians,
  locations,
  monsters,
  regions,
} from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import {
  GLITCH_STATUSES,
  type GlitchDetail,
  type GlitchListItem,
  type GlitchStatus,
} from '#/lib/glitch.ts'
import { checkAnswer, newPuzzle, retryAt, strikeBack } from '#/server/puzzle.ts'
import { checkPick, clueFor } from '#/server/scouting.ts'
import { activeQuestOf, payBounties } from '#/server/quests.ts'
import { nextGlitchId, summonVillagerReports, villagerTick } from '#/server/villagers.ts'
import { requireGuardian } from '#/server/session.ts'

const MAX_DESCRIPTION = 1000

function cleanDescription(value: unknown) {
  const description = String(value ?? '').trim()
  if (!description) throw new Error('Description is required')
  if (description.length > MAX_DESCRIPTION) {
    throw new Error(`Description is limited to ${MAX_DESCRIPTION} characters`)
  }
  return description
}

/** Glitches with their monster, echo count and assigned adventurers. */
function listGlitches(glitchId?: string): GlitchListItem[] {
  const rows = db
    .select({
      glitchId: glitches.glitchId,
      status: glitches.status,
      description: glitches.description,
      timestamp: glitches.timestamp,
      monsterId: glitches.monsterId,
      monsterName: sql<string>`coalesce(${monsters.name}, 'Unknown creature')`,
      danger: sql<number>`coalesce(${monsters.danger}, 1)`,
      locationId: glitches.locationId,
      locationName: locations.name,
      regionId: regions.regionId,
      regionName: regions.name,
      locationDanger: sql<number>`coalesce(${glitches.danger}, ${locations.danger})`,
      reward: sql<number>`coalesce(${glitches.reward}, ${locations.reward})`,
      // Ranked by the monster itself; posted once the guild master set the reward.
      rated: sql<number>`${glitches.reward} is not null`,
      echoCount: count(echoes.echoId),
      villagerReports: sql<number>`count(${echoes.reporterName})`,
    })
    .from(glitches)
    .leftJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .innerJoin(regions, eq(regions.regionId, locations.regionId))
    .leftJoin(echoes, eq(echoes.glitchId, glitches.glitchId))
    .where(glitchId ? eq(glitches.glitchId, glitchId) : undefined)
    .groupBy(glitches.glitchId)
    .orderBy(desc(glitches.timestamp))
    .all()

  const assigned = new Map<string, number[]>()
  for (const a of db
    .select({ glitchId: glitchAssignments.glitchId, guardianId: glitchAssignments.guardianId })
    .from(glitchAssignments)
    .where(glitchId ? eq(glitchAssignments.glitchId, glitchId) : undefined)
    .all()) {
    assigned.set(a.glitchId, [...(assigned.get(a.glitchId) ?? []), a.guardianId])
  }

  return rows.map((r) => ({ ...r, rated: Boolean(r.rated), assignedGuardianIds: assigned.get(r.glitchId) ?? [] }))
}

export const getGlitches = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GlitchListItem[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    villagerTick()
    return listGlitches()
  },
)

export const getGlitch = createServerFn({ method: 'GET' })
  .validator((glitchId: string) => String(glitchId))
  .handler(async ({ data: glitchId }): Promise<GlitchDetail | null> => {
    requireGuardian(PERMISSIONS.glitchView)
    const [glitch] = listGlitches(glitchId)
    if (!glitch) return null

    const glitchEchoes = db
      .select({
        echoId: echoes.echoId,
        glitchId: sql<string>`${echoes.glitchId}`,
        description: echoes.description,
        timestamp: echoes.timestamp,
        reportingGuardianId: echoes.reportingGuardianId,
        reporterCodename: guardians.codename,
        reporterName: echoes.reporterName,
      })
      .from(echoes)
      .leftJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
      .where(eq(echoes.glitchId, glitchId))
      .orderBy(asc(echoes.timestamp))
      .all()

    const assignments = db
      .select({
        guardianId: glitchAssignments.guardianId,
        codename: guardians.codename,
        assignedAt: glitchAssignments.assignedAt,
      })
      .from(glitchAssignments)
      .innerJoin(guardians, eq(guardians.guardianId, glitchAssignments.guardianId))
      .where(eq(glitchAssignments.glitchId, glitchId))
      .orderBy(asc(guardians.codename))
      .all()

    return { ...glitch, echoes: glitchEchoes, assignments }
  })

/**
 * Report an echo (a sighting). Without `glitchId` the echo opens a new glitch
 * (every echo is a glitch by default) of the chosen monster type: a Spotted quest
 * (ranked by its monster) that waits for the guild master's reward. With `glitchId` it is added to that glitch.
 */
export const reportEcho = createServerFn({ method: 'POST' })
  .validator(
    (input: { description: string; glitchId?: string; monsterId?: string; locationId?: string }) => ({
      description: cleanDescription(input?.description),
      glitchId: input?.glitchId ? String(input.glitchId) : undefined,
      monsterId: input?.monsterId ? String(input.monsterId) : undefined,
      locationId: input?.locationId ? String(input.locationId) : undefined,
    }),
  )
  .handler(async ({ data }) => {
    const guardian = requireGuardian(PERMISSIONS.echoCreate)
    const timestamp = new Date().toISOString()

    return db.transaction((tx) => {
      let glitchId = data.glitchId
      if (glitchId) {
        const exists = tx.select().from(glitches).where(eq(glitches.glitchId, glitchId)).get()
        if (!exists) throw new Error(`Glitch ${glitchId} not found`)
      } else {
        const monsterId = data.monsterId ?? 'slime'
        const monster = tx.select().from(monsters).where(eq(monsters.monsterId, monsterId)).get()
        if (!monster) throw new Error(`Unknown monster: ${monsterId}`)
        if (!data.locationId) throw new Error('Choose where you saw the monster')
        const location = tx.select().from(locations).where(eq(locations.locationId, data.locationId)).get()
        if (!location) throw new Error(`Unknown location: ${data.locationId}`)

        glitchId = nextGlitchId(tx)
        tx.insert(glitches)
          .values({
            glitchId,
            status: 'ASSESSING',
            description: data.description,
            timestamp,
            monsterId,
            locationId: location.locationId,
            // The rank follows the monster; the guild master only sets the reward.
            danger: monster.danger,
          })
          .run()
      }

      const { locationId } = tx.select({ locationId: glitches.locationId }).from(glitches).where(eq(glitches.glitchId, glitchId)).get()!
      tx.insert(echoes)
        .values({
          glitchId,
          locationId,
          description: data.description,
          timestamp,
          reportingGuardianId: guardian.guardianId,
        })
        .run()

      return { glitchId }
    })
  })

export const updateGlitchStatus = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; status: GlitchStatus }) => {
    if (!GLITCH_STATUSES.includes(input?.status)) throw new Error('Invalid status')
    return { glitchId: String(input.glitchId), status: input.status }
  })
  .handler(async ({ data }) => {
    requireGuardian(PERMISSIONS.glitchUpdateStatus)
    db.transaction((tx) => {
      const glitch = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)
      if (!glitch.monsterId && data.status !== 'LEAKED') {
        throw new Error('Nobody has seen this monster yet – an adventurer has to investigate first')
      }
      const result = tx
        .update(glitches)
        .set({ status: data.status, slainAt: data.status === 'FIXED' ? new Date().toISOString() : null })
        .where(eq(glitches.glitchId, data.glitchId))
        .run()
      if (result.changes === 0) throw new Error(`Glitch ${data.glitchId} not found`)

      if (data.status === 'FIXED') payBounties(tx, data.glitchId)
    })
    return { ok: true }
  })

/** Scouting reward for the adventurer who identifies the monster behind the villagers' reports. */
const SCOUT_REWARD = 25

export type ScoutOption = { monsterId: string; name: string }
export type ScoutClue = { glitchId: string; silhouette: string; options: ScoutOption[]; retryAt: number | null }
export type ScoutResult =
  | { ok: true; monsterId: string; monsterName: string; rank: number; reward: number }
  | { ok: false; reason: string; retryAt: number | null }

/** The open scouting quest an adventurer investigates, or an error. */
function scoutingQuest(glitchId: string) {
  const glitch = db.select().from(glitches).where(eq(glitches.glitchId, glitchId)).get()
  if (!glitch) throw new Error(`Glitch ${glitchId} not found`)
  if (glitch.status !== 'LEAKED' || glitch.monsterId) throw new Error('This monster has already been identified')
  return glitch
}

/**
 * Investigate a scouting quest: the server secretly rolls the monster behind the villagers'
 * reports (rarer the more dangerous) and shows its silhouette with three monsters to pick from.
 * The browser needs the monster to draw its silhouette; the pick itself is checked here.
 */
export const getScoutClue = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string }) => ({ glitchId: String(input?.glitchId) }))
  .handler(async ({ data }): Promise<ScoutClue> => {
    requireGuardian(PERMISSIONS.questAccept)
    scoutingQuest(data.glitchId)
    const all = db.select({ monsterId: monsters.monsterId, name: monsters.name, danger: monsters.danger }).from(monsters).all()
    const clue = clueFor(data.glitchId, all)
    const name = new Map(all.map((m) => [m.monsterId, m.name]))
    return {
      glitchId: data.glitchId,
      silhouette: clue.monsterId,
      options: clue.options.map((monsterId) => ({ monsterId, name: name.get(monsterId)! })),
      retryAt: clue.retryAt && clue.retryAt > Date.now() ? clue.retryAt : null,
    }
  })

/**
 * Pick the monster matching the silhouette. Right: the quest is Spotted with the monster's rank,
 * the scout earns the scouting reward and the guild master only has to set the reward.
 */
export const investigateQuest = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; monsterId: string }) => ({
    glitchId: String(input?.glitchId),
    monsterId: String(input?.monsterId),
  }))
  .handler(async ({ data }): Promise<ScoutResult> => {
    const scout = requireGuardian(PERMISSIONS.questAccept)
    const glitch = scoutingQuest(data.glitchId)
    const pick = checkPick(data.glitchId, data.monsterId)
    if (!pick.ok) return pick
    const monster = db.select().from(monsters).where(eq(monsters.monsterId, pick.monsterId)).get()!
    const now = new Date().toISOString()
    db.transaction((tx) => {
      tx.update(glitches)
        .set({ monsterId: monster.monsterId, danger: monster.danger, status: 'ASSESSING' })
        .where(eq(glitches.glitchId, data.glitchId))
        .run()
      tx.insert(echoes)
        .values({
          glitchId: data.glitchId,
          locationId: glitch.locationId,
          description: `Followed the villagers' clues: it's a ${monster.name}!`,
          timestamp: now,
          reportingGuardianId: scout.guardianId,
        })
        .run()
      tx.insert(bounties)
        .values({ glitchId: data.glitchId, guardianId: scout.guardianId, kind: 'scout', gold: SCOUT_REWARD, paidAt: now })
        .onConflictDoNothing()
        .run()
    })
    return { ok: true, monsterId: monster.monsterId, monsterName: monster.name, rank: monster.danger, reward: SCOUT_REWARD }
  })

/** The guild master sets a Spotted quest's reward (its rank follows the monster): adventurers can now accept it. */
export const rateQuest = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; reward: number }) => {
    const reward = Math.round(Number(input?.reward))
    if (!(reward >= 0 && reward <= 100_000)) throw new Error('Reward must be between 0 and 100000 gold')
    return { glitchId: String(input?.glitchId), reward }
  })
  .handler(async ({ data }) => {
    requireGuardian(PERMISSIONS.locationManage)
    const glitch = db.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
    if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)
    if (!glitch.monsterId) throw new Error('Nobody has seen this monster yet – an adventurer has to investigate first')
    if (glitch.status === 'FIXED') throw new Error('This monster has already been slain')
    const monster = db.select({ danger: monsters.danger }).from(monsters).where(eq(monsters.monsterId, glitch.monsterId)).get()
    db.update(glitches)
      .set({ danger: glitch.danger ?? monster?.danger ?? 1, reward: data.reward })
      .where(eq(glitches.glitchId, data.glitchId))
      .run()
    return { ok: true }
  })

/** Guild master (demo): villagers flood a quiet place with reports, opening a scouting quest. */
export const summonVillagers = createServerFn({ method: 'POST' }).handler(async () => {
  requireGuardian(PERMISSIONS.locationManage)
  return summonVillagerReports()
})

/** The party member and the quest they want to fight, or an error. */
function fightCheck(glitchId: string, guardianId: number) {
  const glitch = db.select().from(glitches).where(eq(glitches.glitchId, glitchId)).get()
  if (!glitch) throw new Error(`Glitch ${glitchId} not found`)
  if (glitch.status === 'FIXED') throw new Error('This monster has already been slain')
  if (glitch.status !== 'CONTAINING') throw new Error('Accept the quest first')
  const member = db
    .select({ id: glitchAssignments.guardianId })
    .from(glitchAssignments)
    .where(and(eq(glitchAssignments.glitchId, glitchId), eq(glitchAssignments.guardianId, guardianId)))
    .get()
  if (!member) throw new Error('Only the quest party can fight this monster')
  const { rank } = db
    .select({ rank: sql<number>`coalesce(${glitches.danger}, ${locations.danger})` })
    .from(glitches)
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .where(eq(glitches.glitchId, glitchId))
    .get()!
  return rank
}

export type FightPuzzle = { seed: number; code: string; ask: string; rank: number; retryAt: number | null }

/** Start (or retry) the fight: a code puzzle as hard as the quest rank. */
export const getFightPuzzle = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string }) => ({ glitchId: String(input?.glitchId) }))
  .handler(async ({ data }): Promise<FightPuzzle> => {
    const adventurer = requireGuardian(PERMISSIONS.questAccept)
    const rank = fightCheck(data.glitchId, adventurer.guardianId)
    return { ...newPuzzle(rank), rank, retryAt: retryAt(data.glitchId, adventurer.guardianId) }
  })

export type FightResult = { slain: true; reward: number } | { slain: false; retryAt: number }

/** Answer the puzzle. Right: the monster is slain and the party is paid. Wrong: it strikes back. */
export const answerFightPuzzle = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; seed: number; answer: number }) => {
    const answer = Number(input?.answer)
    if (!Number.isFinite(answer)) throw new Error('Your answer must be a number')
    return { glitchId: String(input?.glitchId), seed: Math.floor(Number(input?.seed)), answer }
  })
  .handler(async ({ data }): Promise<FightResult> => {
    const adventurer = requireGuardian(PERMISSIONS.questAccept)
    const rank = fightCheck(data.glitchId, adventurer.guardianId)
    if (retryAt(data.glitchId, adventurer.guardianId)) throw new Error('The monster is still striking back – wait a moment')
    if (!checkAnswer(data.seed, rank, data.answer)) {
      return { slain: false, retryAt: strikeBack(data.glitchId, adventurer.guardianId) }
    }
    const reward = db.transaction((tx) => {
      const now = new Date().toISOString()
      tx.update(glitches).set({ status: 'FIXED', slainAt: now }).where(eq(glitches.glitchId, data.glitchId)).run()
      tx.insert(echoes)
        .values({
          glitchId: data.glitchId,
          locationId: sql`(select ${glitches.locationId} from ${glitches} where ${glitches.glitchId} = ${data.glitchId})`,
          description: `Monster slain! The spell resolved to ${data.answer}.`,
          timestamp: now,
          reportingGuardianId: adventurer.guardianId,
        })
        .run()
      return payBounties(tx, data.glitchId)
    })
    return { slain: true, reward }
  })

/** An adventurer takes on (or leaves) the quest for a monster. */
export const setQuestAccepted = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; accepted: boolean }) => ({
    glitchId: String(input?.glitchId),
    accepted: Boolean(input?.accepted),
  }))
  .handler(async ({ data }) => {
    const adventurer = requireGuardian(PERMISSIONS.questAccept)
    db.transaction((tx) => {
      const glitch = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)
      if (glitch.status === 'FIXED') throw new Error('This monster has already been slain')

      if (data.accepted) {
        if (glitch.status === 'LEAKED' || !glitch.monsterId) throw new Error('Investigate first: nobody knows which monster this is yet')
        if (glitch.reward === null) throw new Error('The guild master still has to set the reward of this quest')
        const busy = activeQuestOf(tx, adventurer.guardianId, data.glitchId)
        if (busy) throw new Error(`You're already on quest ${busy}. Leave that quest first – one monster at a time!`)
        if (glitch.status === 'ASSESSING') {
          tx.update(glitches).set({ status: 'CONTAINING' }).where(eq(glitches.glitchId, data.glitchId)).run()
        }
        tx.insert(glitchAssignments)
          .values({
            glitchId: data.glitchId,
            guardianId: adventurer.guardianId,
            assignedAt: new Date().toISOString(),
            assignedBy: adventurer.guardianId,
          })
          .onConflictDoNothing()
          .run()
      } else {
        tx.delete(glitchAssignments)
          .where(
            and(
              eq(glitchAssignments.glitchId, data.glitchId),
              eq(glitchAssignments.guardianId, adventurer.guardianId),
            ),
          )
          .run()
      }
    })
    return { ok: true }
  })

/** The guild sends out exactly these adventurers (defenders) to a monster. */
export const assignAdventurers = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; guardianIds: number[] }) => {
    const guardianIds = [...new Set((input?.guardianIds ?? []).map(Number))]
    if (guardianIds.some((id) => !Number.isInteger(id))) throw new Error('Invalid adventurer')
    return { glitchId: String(input.glitchId), guardianIds }
  })
  .handler(async ({ data }) => {
    const guild = requireGuardian(PERMISSIONS.glitchAssign)
    const now = new Date().toISOString()

    db.transaction((tx) => {
      const glitch = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)

      if (data.guardianIds.length) {
        const adventurers = tx
          .select({ guardianId: guardians.guardianId })
          .from(guardians)
          .where(and(inArray(guardians.guardianId, data.guardianIds), eq(guardians.roleId, 'defender')))
          .all()
        if (adventurers.length !== data.guardianIds.length) {
          throw new Error('Only adventurers (defenders) can be sent out')
        }
      }

      const current = tx
        .select({ guardianId: glitchAssignments.guardianId })
        .from(glitchAssignments)
        .where(eq(glitchAssignments.glitchId, data.glitchId))
        .all()
        .map((a) => a.guardianId)

      for (const guardianId of data.guardianIds.filter((id) => !current.includes(id))) {
        const busy = activeQuestOf(tx, guardianId, data.glitchId)
        if (busy) {
          const who = tx.select({ codename: guardians.codename }).from(guardians).where(eq(guardians.guardianId, guardianId)).get()
          throw new Error(`${who?.codename ?? 'That adventurer'} is already on quest ${busy} – one monster at a time`)
        }
      }

      const toRemove = current.filter((id) => !data.guardianIds.includes(id))
      const toAdd = data.guardianIds.filter((id) => !current.includes(id))

      if (toRemove.length) {
        tx.delete(glitchAssignments)
          .where(
            and(
              eq(glitchAssignments.glitchId, data.glitchId),
              inArray(glitchAssignments.guardianId, toRemove),
            ),
          )
          .run()
      }
      if (toAdd.length) {
        if (!glitch.monsterId) throw new Error('Investigate first: nobody knows which monster this is yet')
        if (glitch.status === 'ASSESSING') {
          const location = tx.select().from(locations).where(eq(locations.locationId, glitch.locationId)).get()!
          tx.update(glitches)
            .set({ status: 'CONTAINING', danger: glitch.danger ?? location.danger, reward: glitch.reward ?? location.reward })
            .where(eq(glitches.glitchId, data.glitchId))
            .run()
        }
        tx.insert(glitchAssignments)
          .values(
            toAdd.map((guardianId) => ({
              glitchId: data.glitchId,
              guardianId,
              assignedAt: now,
              assignedBy: guild.guardianId,
            })),
          )
          .run()
      }
    })
    return { ok: true }
  })

export const deleteGlitch = createServerFn({ method: 'POST' })
  .validator((glitchId: string) => String(glitchId))
  .handler(async ({ data: glitchId }) => {
    requireGuardian(PERMISSIONS.glitchDelete)
    db.delete(glitches).where(eq(glitches.glitchId, glitchId)).run()
    return { ok: true }
  })

export type Threat = { glitchId: string; monsterName: string; locationName: string; regionName: string }

/**
 * S-class threats still at large (a danger-5 monster, or any monster at a rank-S location).
 * While there is at least one, the whole guild is in lockdown.
 */
export const getThreats = createServerFn({ method: 'GET' }).handler(async (): Promise<Threat[]> => {
  requireGuardian(PERMISSIONS.glitchView)
  return db
    .select({
      glitchId: glitches.glitchId,
      monsterName: monsters.name,
      locationName: locations.name,
      regionName: regions.name,
    })
    .from(glitches)
    .innerJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .innerJoin(regions, eq(regions.regionId, locations.regionId))
    .where(
      sql`${glitches.status} != 'FIXED' and (${monsters.danger} >= 5 or coalesce(${glitches.danger}, ${locations.danger}) >= 5)`,
    )
    .orderBy(desc(glitches.timestamp))
    .all()
})
