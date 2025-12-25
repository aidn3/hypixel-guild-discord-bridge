import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber, titleCase } from '../../../common/helper-functions.js'
import { getLevelByXp } from '../common/skills'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

const DungeonClasses = ['healer', 'mage', 'berserk', 'archer', 'tank'] as const
type DungeonClass = (typeof DungeonClasses)[number]

export default class Catacomb extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['catacombs', 'cata', 'dungeons'],
      description: 'Skyblock Dungeons stats of specified user.',
      example: `catacombs %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const dungeons = selectedProfile.dungeons
    if (!dungeons) return playerNeverPlayedDungeons(givenUsername)

    const catacombsExperience = dungeons.dungeon_types?.catacombs?.experience ?? 0
    const catacombsLevel = getLevelByXp(catacombsExperience, { type: 'dungeoneering' }).levelWithProgress

    const playerClasses = dungeons.player_classes
    if (!playerClasses) return playerNeverPlayedDungeons(givenUsername)

    const classLevels: { className: DungeonClass; level: number }[] = DungeonClasses.map((className) => {
      const experience = playerClasses[className]?.experience ?? 0
      return {
        className: className,
        level: getLevelByXp(experience, { type: 'dungeoneering' }).levelWithProgress
      }
    })

    const classAverage = classLevels.reduce((total, entry) => total + entry.level, 0) / classLevels.length
    const classesDisplay = classLevels
      .map((entry) => `${formatNumber(entry.level, 2)}${entry.className[0].toUpperCase()}`)
      .join(', ')

    const selectedClass = titleCase(dungeons.selected_dungeon_class ?? 'none')
    const secretsFound = dungeons.secrets ?? 0

    return (
      `${givenUsername}'s Catacombs: ${formatNumber(catacombsLevel, 2)} | ` +
      `Selected Class: ${selectedClass} | ` +
      `Class Average: ${formatNumber(classAverage, 2)} | ` +
      `Secrets Found: ${formatNumber(secretsFound, 0)} | ` +
      `Classes: ${classesDisplay}`
    )
  }
}
