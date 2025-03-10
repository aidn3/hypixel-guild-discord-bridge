import type { APIEmbed } from 'discord.js'
import { escapeMarkdown } from 'discord.js'

import type Application from '../../../application.js'
import { Color, type InstanceType, type MinecraftRawChatEvent } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'

import { DefaultCommandFooter } from './discord-config.js'

export interface RegexChat {
  success: RegExp[]
  failure: RegExp[]
}

const GeneralChat: RegexChat = {
  success: [],
  failure: [
    /^Can't find a player by the name of '(\w{3,32})'*/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is not in your guild!/,
    /^You must be the Guild Master to use that command.*/,
    /^You do not have permission to use this command!/,
    /^Your guild rank does not have permission to use this!/
  ]
}

export const RankChat: RegexChat = {
  success: [
    ...GeneralChat.success,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) was promoted from.*/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) was demoted from.*/
  ],
  failure: [
    ...GeneralChat.failure,
    /^I couldn't find a rank by the name of.*/,
    /^You can only promote up to your own rank.*/,
    /^You can only demote up to your own rank.*/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is already the lowest rank you've created.*/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is the guild master so can't be promoted anymore!/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is the guild master so can't be demoted!/
  ]
}

export const KickChat: RegexChat = {
  success: [
    ...GeneralChat.success,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) was kicked from the guild by (?:\[[+A-Z]{1,10}] )*(\w{3,32})!/
  ],
  failure: [
    ...GeneralChat.failure,
    /^Invalid usage! '\/guild kick <player> <reason>'/,
    /^You cannot kick yourself from the guild!/,
    /^You do not have permission to kick people from the guild!/,
    /^You cannot kick this player!/
  ]
}

export const MuteChat: RegexChat = {
  success: [
    ...GeneralChat.success,
    /^(?:\[[+A-Z]{1,10}] )*\w{3,32} has muted (?:\[[+A-Z]{1,10}] )*(\w{3,32}|the guild chat) for.*/
  ],
  failure: [
    ...GeneralChat.failure,
    /^Invalid usage! '\/guild mute <player\/everyone> <time>'/,
    /^You cannot mute someone for more than one month/,
    /^You cannot mute someone for less than a minute/,
    /^You cannot mute yourself from the guild!/,
    /^You cannot mute a guild member with a higher guild rank!/
  ]
}

export const UnmuteChat: RegexChat = {
  success: [
    ...GeneralChat.success,
    /^(?:\[[+A-Z]{1,10}] )*\w{3,32} has unmuted (?:\[[+A-Z]{1,10}] )*(\w{3,32}|the guild chat).*/
  ],
  failure: [
    ...GeneralChat.failure,
    /^Invalid usage! '\/guild unmute <player\/everyone>'/,
    /^This player is not muted!/,
    /^The guild is not muted!/
  ]
}

export const InviteAcceptChat: RegexChat = {
  success: [
    ...GeneralChat.success,
    /^You invited (?:\[[+A-Z]{1,10}] )*(\w{3,32}) to your guild. They have 5 minutes to accept/,
    /^You sent an offline invite to (?:\[[+A-Z]{1,10}] )*(\w{3,32})! They will have 5 minutes to accept once they come online!/,
    /^You've already invited (?:\[[+A-Z]{1,10}] )*(\w{3,32}) to your guild! Wait for them to accept!/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) joined the guild!/
  ],
  failure: [
    ...GeneralChat.failure,
    /^You do not have permission to invite players!/,
    /^You cannot invite this player to your guild!/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is already in another guild!/,
    /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) is already in your guild!/,
    /^Already in a guild!/,
    /^Your guild is full!/
  ]
}

export interface ChatTriggerResult {
  status: 'success' | 'failed' | 'error'
  message: string[]
}

export async function checkChatTriggers(
  app: Application,
  eventHelper: EventHelper<InstanceType.Discord>,
  regexList: RegexChat,
  targetInstance: string[],
  command: string,
  username: string
): Promise<ChatTriggerResult> {
  const result: ChatTriggerResult = {
    status: 'error',
    message: []
  }

  const chatListener = function (event: MinecraftRawChatEvent): void {
    if (event.message.length === 0) return

    for (const regex of regexList.success) {
      const match = regex.exec(event.message)
      if (match === null) continue
      if (match.length > 1 && match[1].toLowerCase() !== username.toLowerCase()) continue

      if (result.status !== 'success') result.message = []
      result.status = 'success'
      result.message.push(`[${event.instanceName}] ${match[0]}`)
    }

    if (result.status !== 'success') {
      for (const regex of regexList.failure) {
        const match = regex.exec(event.message)
        if (match === null) continue
        if (match.length > 1 && match[1].toLowerCase() !== username.toLowerCase()) continue

        result.status = 'failed'
        result.message.push(`[${event.instanceName}] ${match[0]}`)
      }
    }
  }

  app.on('minecraftChat', chatListener)
  app.emit('minecraftSend', {
    ...eventHelper.fillBaseEvent(),
    targetInstanceName: targetInstance,
    command
  })
  await new Promise((resolve) => setTimeout(resolve, 5000))
  app.removeListener('minecraftChat', chatListener)

  return result
}

export function formatChatTriggerResponse(results: ChatTriggerResult, title: string): APIEmbed {
  let color: Color
  switch (results.status) {
    case 'success': {
      color = Color.Good
      break
    }
    case 'failed': {
      color = Color.Info
      break
    }
    case 'error': {
      color = Color.Bad
    }
  }

  return {
    title: title,
    color: color,
    description: formatBody(results),
    footer: {
      text: DefaultCommandFooter
    }
  }
}

function formatBody(results: ChatTriggerResult): string {
  let message = ''

  switch (results.status) {
    case 'error': {
      return 'No response returned while executing the command.'
    }
    case 'failed': {
      message += '_Executing command failed._\n\n'
    }
  }

  if (results.message.length === 0) {
    message += '**No response returned while executing the command.**'
    return message
  } else if (results.message.length === 1) {
    message += `> ${escapeMarkdown(results.message[0])}`
    return message
  } else {
    message += `**Multiple responses have been detected but cannot tell which belong to this command:**\n`
    message += '```' + results.message.join('\n') + '```'
    return message
  }
}
