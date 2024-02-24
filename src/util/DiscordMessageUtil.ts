import { Message, TextChannel } from 'discord.js'
import emojisMap from 'emoji-name-map'

function cleanGuildEmoji(message: string): string {
  return message.replaceAll(/<:(\w+):\d{16,}>/g, (match) => {
    return match.slice(1, -1).replaceAll(/\d{16,}/g, '')
  })
}

function cleanStandardEmoji(message: string): string {
  for (const [emojiReadable, emojiUnicode] of Object.entries(emojisMap.emoji)) {
    message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
  }

  return message
}

export function cleanMessage(messageEvent: Message): string {
  let content = messageEvent.cleanContent

  content = cleanGuildEmoji(content)
  content = cleanStandardEmoji(content).trim()

  if (messageEvent.attachments.size > 0) {
    for (const [, attachment] of messageEvent.attachments) {
      if (attachment.contentType?.includes('image') === true) {
        const link = attachment.url
        const linkWithoutTracking = link.split('?')[0]
        content += ` ${linkWithoutTracking}`
      } else {
        content += ' (ATTACHMENT)'
      }
    }
  }

  return content
}

export const escapeDiscord = function (message: string): string {
  message = message.split('\\').join('\\\\') // "\"
  message = message.split('_').join('\\_') // Italic
  message = message.split('*').join('\\*') // bold
  message = message.split('~').join('\\~') // strikethrough
  message = message.split('`').join('\\`') // code
  message = message.split('@').join('\\@-') // mentions

  return message
}

export const getReplyUsername = async function (messageEvent: Message): Promise<string | undefined> {
  if (messageEvent.reference?.messageId === undefined) return

  const channel = messageEvent.channel as TextChannel
  const replyMessage = await channel.messages.fetch(messageEvent.reference.messageId)
  if (replyMessage.webhookId != undefined) return replyMessage.author.username

  if (messageEvent.guild == undefined) return
  const guildMember = await messageEvent.guild.members.fetch(replyMessage.author.id)
  return guildMember.displayName
}

export const getReadableName = function (username: string, id: string): string {
  // clear all non ASCII characters
  // eslint-disable-next-line no-control-regex
  username = username.replaceAll(/[^\u0000-\u007F]/g, '')

  username = username.trim().slice(0, 16)

  if (/^\w+$/.test(username)) return username
  if (username.includes(' ')) return username.split(' ')[0]

  return id
}
