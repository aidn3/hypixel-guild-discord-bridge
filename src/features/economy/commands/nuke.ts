import { ChannelType, Permission, Platform, PunishmentPurpose } from '../../../common/application-event'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands'
import type { MojangProfile } from '../../../common/user'
import { EconomyNuke } from '../economy-constants'
import { type EconomyDatabase, EconomyNotEnough, EconomyReason } from '../economy-database'

export class Nuke extends ChatCommandHandler {
  constructor(private readonly database: EconomyDatabase) {
    super({
      id: 'nuke',
      type: ChatCommandGroup.Economy,
      triggers: ['nuke'],
      description: 'Mute a random maximum of 4 to 8 online guild members for 3 minutes each',
      example: 'nuke'
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft], sources: [ChannelType.Public] }
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.Community, duration: EconomyNuke.cooldown }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const responsibleUser = context.message.user
    try {
      this.database.transaction((context) => {
        context.getAccount(responsibleUser).decrease(EconomyNuke.amount, { reason: EconomyReason.Nuke })
      })
    } catch (error: unknown) {
      if (error instanceof EconomyNotEnough) {
        context.resetCooldown()
        return `${context.message.user.displayName()}, need ${EconomyNuke.amount} aura to use this!`
      }
      throw error
    }

    await context.sendFeedback('Locking nuclear targets...')

    const usernames = await this.getUsernames(context)
    if (usernames.length === 0) {
      context.resetCooldown()
      return 'Targeting system found no online guild members to lock onto.'
    }

    const profiles = await context.app.mojangApi.profilesByUsername(new Set<string>(usernames))
    const mutedUsernames: string[] = []
    const shuffledProfiles = this.shuffle(profiles.entries().toArray())
    const targetCount = this.pickTargetCount()

    for (const [name, id] of shuffledProfiles) {
      if (id === undefined) continue

      context.logger.debug(`Checking ${name}/${id} for nuke`)
      const userProfile: MojangProfile = { id, name }
      const user = await context.app.core.initializeMinecraftUser(userProfile, {})
      const self = user.equalsUser(context.message.user)
      const staff = (await user.permission()) >= Permission.Helper
      const immune = await user.immune()

      if (self || staff || immune) {
        continue
      }

      await user.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        EconomyNuke.mute,
        `Victim to ${context.commandPrefix}${this.triggers[0]}`
      )

      mutedUsernames.push(userProfile.name)
      if (mutedUsernames.length >= targetCount) break
    }

    if (mutedUsernames.length === 0) {
      context.resetCooldown()
      return 'Target lock failed. Every online player was protected from launch.'
    }

    return `Payload delivered. ${mutedUsernames.length} targets were nuked: ${mutedUsernames.join(', ')}`
  }

  private async getUsernames(context: ChatCommandContext): Promise<string[]> {
    const instances = context.app.minecraftManager.getAllInstances()

    const usernames: Promise<string[]>[] = []
    for (const instance of instances) {
      const chunk = instance.guildManager
        .list()
        .then((guild) => guild.members)
        .then((members) => members.filter((member) => member.online).map((member) => member.username))
        .then((usernames) => usernames.filter((username) => !context.app.minecraftManager.isMinecraftBot(username)))
        .catch(() => [] as string[])

      usernames.push(chunk)
    }

    const resolvedChunks = await Promise.all(usernames)
    return resolvedChunks.flat()
  }

  private shuffle<T>(values: T[]): T[] {
    const copy = [...values]

    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
    }

    return copy
  }

  private pickTargetCount(): number {
    return Math.floor(Math.random() * (EconomyNuke.maxTargets - EconomyNuke.minTargets + 1)) + EconomyNuke.minTargets
  }
}
