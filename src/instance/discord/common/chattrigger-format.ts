import type { APIEmbed } from 'discord.js'
import { escapeMarkdown } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { ChatTriggerResult } from '../../../util/chat-triggers.js'

import { DefaultCommandFooter } from './discord-config.js'

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
    message += `> ${escapeMarkdown(formatMessage(results.message[0]))}`
    return message
  } else {
    message += `**Multiple responses have been detected but cannot tell which belong to this command:**\n`
    message += '```' + results.message.map((item) => formatMessage(item)).join('\n') + '```'
    return message
  }
}

function formatMessage(message: { instanceName: string; content: string }): string {
  return `[${message.instanceName}] ${message.content}`
}
