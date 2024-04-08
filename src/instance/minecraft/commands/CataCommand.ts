import * as assert from "node:assert"
import { Client, SkyblockMember } from "hypixel-api-reborn"
import { ChatCommandContext, ChatCommandHandler } from "../common/ChatInterface"

export default {
  name: "Catacombs",
  triggers: ["catacomb", "cata"],
  description: "Returns a player's catacombs level",
  example: `cata %s`,
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const parsedProfile = await getParsedProfile(context.clientInstance.app.hypixelApi, uuid)

    const catacombs = parsedProfile.dungeons.types.catacombs
    const skillLevel = getLevelWithOverflow(catacombs.xp, catacombs.level, catacombs.progress)

    return `${givenUsername} is Catacombs ${skillLevel.toFixed(2)} ${formatClass(parsedProfile)}.`
  }
} satisfies ChatCommandHandler

async function getParsedProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
  const selectedProfile = await hypixelApi
    .getSkyblockProfiles(uuid, { raw: true })
    .then((response) => response.profiles.find((p) => p.selected)?.cute_name)
  assert(selectedProfile)

  const response = await hypixelApi
    .getSkyblockProfiles(uuid)
    .then((profiles) => profiles.find((profile) => profile.profileName === selectedProfile)?.me)
  assert(response)
  return response
}

function getLevelWithOverflow(totalExperience: number, level: number, progress: number): number {
  const PER_LEVEL = 200_000_000
  const MAX_50_XP = 569_809_640

  if (totalExperience > MAX_50_XP) {
    // account for overflow
    const remainingExperience = totalExperience - MAX_50_XP
    const extraLevels = Math.floor(remainingExperience / PER_LEVEL)
    const fractionLevel = (remainingExperience % PER_LEVEL) / PER_LEVEL

    return 50 + extraLevels + fractionLevel
  } else {
    return Number(level) + progress / 100
  }
}

function formatClass(member: SkyblockMember): string {
  const classes = member.dungeons.classes

  let xp = 0
  let level = 0
  let name = "(None)"

  if (classes.healer.xp > xp) {
    xp = classes.healer.xp
    level = getLevelWithOverflow(classes.healer.xp, classes.healer.level, classes.healer.progress)
    name = "Healer"
  }
  if (classes.mage.xp > xp) {
    xp = classes.mage.xp
    level = getLevelWithOverflow(classes.mage.xp, classes.mage.level, classes.mage.progress)
    name = "Mage"
  }
  if (classes.berserk.xp > xp) {
    xp = classes.berserk.xp
    level = getLevelWithOverflow(classes.berserk.xp, classes.berserk.level, classes.berserk.progress)
    name = "Berserk"
  }
  if (classes.archer.xp > xp) {
    xp = classes.archer.xp
    level = getLevelWithOverflow(classes.archer.xp, classes.archer.level, classes.archer.progress)
    name = "Archer"
  }
  if (classes.tank.xp > xp) {
    level = getLevelWithOverflow(classes.tank.xp, classes.tank.level, classes.tank.progress)
    name = "Tank"
  }
  return `${name} ${level.toFixed(2)}`
}
