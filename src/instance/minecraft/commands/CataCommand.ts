import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { Client, SkyblockMember } from 'hypixel-api-reborn'

export default {
  triggers: ['catacomb', 'cata'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const parsedProfile = await getParsedProfile(context.clientInstance.app.hypixelApi, uuid)

    return (
      `${givenUsername} is Catacombs ` +
      `${parsedProfile.dungeons.types.catacombs.level}.${parsedProfile.dungeons.types.catacombs.progress}` +
      ` ${formatClass(parsedProfile.dungeons.classes)}.`
    )
  }
} satisfies MinecraftCommandMessage

async function getParsedProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
  const selectedProfile = await hypixelApi
    .getSkyblockProfiles(uuid, { raw: true })
    .then((response: any) => response.profiles)
    .then((profiles: any[]) => profiles.filter((p) => p.selected)[0].cute_name)

  return await hypixelApi
    .getSkyblockProfiles(uuid)
    .then((profiles) => profiles.filter((profile) => profile.profileName === selectedProfile)[0].me)
}

function formatClass(classes: any): string {
  let xp: number = 0
  let level: number = 0
  let name: string = '(None)'

  if (classes.healer.xp > xp) {
    xp = classes.healer.xp
    level = Number(classes.healer.level) + classes.healer.progress / 100
    name = 'Healer'
  }
  if (classes.mage.xp > xp) {
    xp = classes.mage.xp
    level = Number(classes.mage.level) + classes.mage.progress / 100
    name = 'Mage'
  }
  if (classes.berserk.xp > xp) {
    xp = classes.berserk.xp
    level = Number(classes.berserk.level) + classes.berserk.progress / 100
    name = 'Berserk'
  }
  if (classes.archer.xp > xp) {
    xp = classes.archer.xp
    level = Number(classes.archer.level) + classes.archer.progress / 100
    name = 'Archer'
  }
  if (classes.tank.xp > xp) {
    level = Number(classes.tank.level) + classes.tank.progress / 100
    name = 'Tank'
  }
  return `${name} ${level.toFixed(2)}`
}
