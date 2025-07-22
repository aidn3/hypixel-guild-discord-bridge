import assert from 'node:assert'

import type { UserIdentifier } from '../../../common/application-event.js'
import { ChannelType, Color, MinecraftSendChatPriority } from '../../../common/application-event.js'
// eslint-disable-next-line import/no-restricted-paths
import type { HeatType } from '../../moderation/commands-heat.js'
// eslint-disable-next-line import/no-restricted-paths
import { HeatResult } from '../../moderation/commands-heat.js'

import type { MinecraftChatContext } from './chat-interface.js'

export async function checkHeat(context: MinecraftChatContext, issuedBy: string, heatType: HeatType): Promise<void> {
  const mojangProfile = await context.application.mojangApi.profileByUsername(issuedBy).catch(() => undefined)

  const identifier = {
    userName: mojangProfile?.name ?? issuedBy,
    userUuid: mojangProfile?.id,
    userDiscordId: undefined
  } satisfies UserIdentifier

  if (context.application.moderation.immuneMinecraft(identifier.userName)) return
  if (context.application.minecraftManager.isMinecraftBot(identifier.userName)) return
  const heatResult = context.application.moderation.commandsHeat.add(identifier, heatType)

  if (heatResult === HeatResult.Warn) {
    context.application.emit('broadcast', {
      ...context.eventHelper.fillBaseEvent(),
      channels: [ChannelType.Public, ChannelType.Officer],
      color: Color.Info,

      username: issuedBy,
      message: `${issuedBy}, you have been issuing too many dangerous commands in a short time. Slow down!`
    })
  } else if (heatResult === HeatResult.Denied) {
    context.application.emit('broadcast', {
      ...context.eventHelper.fillBaseEvent(),
      channels: [ChannelType.Public, ChannelType.Officer],
      color: Color.Bad,

      username: issuedBy,
      message: `${issuedBy}, you have issued too many dangerous commands in a short time. Stop it!`
    })

    await context.clientInstance.send(`/g demote ${issuedBy}`, MinecraftSendChatPriority.High, undefined)
  }
}

export function getUuidFromGuildChat(message: unknown): string {
  // this is minecraft protocol for chat message
  // @ts-expect-error fields exist but hidden
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const clickCommand = message.extra[0].clickEvent.value as string

  // clickCommand: "/viewprofile <UUID>"
  const uuidWithDashes = clickCommand.split(' ')[1].trim()
  const uuid = uuidWithDashes.replaceAll('-', '')
  assert.ok(uuid.length === 32, `Invalid uuid. given: ${uuid}`)

  return uuid
}
