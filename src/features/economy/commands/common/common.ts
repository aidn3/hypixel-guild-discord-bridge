import type { ChatCommandContext } from '../../../../common/commands'
import type { MinecraftUser } from '../../../../common/user'
import { usernameNotExists } from '../../../../instance/commands/common/utility'
import { parseNumberWithSuffice } from '../../../../utility/shared-utility'
import type { EconomyOverflow } from '../../economy-database'

export async function resolveDifferentTarget(
  context: ChatCommandContext,
  givenUsername: string | undefined
): Promise<string | MinecraftUser> {
  const user = await resolveTarget(context, givenUsername)
  if (typeof user === 'string') return user

  if (context.message.user.equalsUser(user)) {
    context.resetCooldown()
    return `${context.username}, you can't use this on yourself!`
  }

  return user
}

export async function resolveTarget(
  context: ChatCommandContext,
  givenUsername: string | undefined
): Promise<string | MinecraftUser> {
  if (givenUsername === undefined) {
    context.resetCooldown()
    return 'You must specify someone'
  }

  const userSender = context.message.user
  if (userSender.isMojangUser() && userSender.mojangProfile().name.toLowerCase() === givenUsername.toLowerCase()) {
    return userSender
  }

  if (givenUsername.toLowerCase() === 'everyone') {
    context.resetCooldown()
    return `${context.username}, you use this on everyone!`
  }

  const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
  if (profile == undefined) {
    context.resetCooldown()
    return usernameNotExists(context, givenUsername)
  }

  return await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
}

export function resolveAmount(context: ChatCommandContext, givenAmount: string | undefined): number | string {
  if (givenAmount === undefined) return 'You must specify an amount'

  try {
    return parseNumberWithSuffice(givenAmount)
  } catch {
    return `${context.message.user.displayName()}, amount must be a valid number!`
  }
}

export async function inSameGuild(context: ChatCommandContext, user: MinecraftUser): Promise<string | undefined> {
  const profile = user.mojangProfile()

  const guild = await context.app.hypixelApi.getGuildByPlayer(profile.id)
  const botUuids = new Set(context.app.minecraftManager.getMinecraftBots().map((bot) => bot.uuid))
  if (!guild?.members.some((member) => botUuids.has(member.uuid))) {
    context.resetCooldown()
    return `${profile.name} is not in any shared guild.`
  }
}

export function economyOverflow(error: EconomyOverflow): string {
  return `Can not give ${error.user.displayName()} ${error.totalChange} since it will exceeds the max allowed funds limit ${error.maxAllowed}!`
}
