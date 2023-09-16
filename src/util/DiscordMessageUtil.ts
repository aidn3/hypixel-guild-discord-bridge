import { Message, TextChannel } from 'discord.js'
import * as emojisMap from 'emoji-name-map'

function cleanGuildEmoji(message: string): string {
  return message.replace(/<:(\w+):\d{16,}>/g, (match) => {
    return match.substring(1, match.length - 1).replace(/\d{16,}/g, '')
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
    messageEvent.attachments.forEach((attachment) => {
      if (attachment.contentType?.includes('image') === true) {
        content += ` ${attachment.url}`
      } else {
        content += ' (ATTACHMENT)'
      }
    })
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
  if (replyMessage.webhookId != null) return replyMessage.author.username

  if (messageEvent.guild == null) return
  const guildMember = await messageEvent.guild.members.fetch(replyMessage.author.id)
  return guildMember.displayName
}

export const getReadableName = function (username: string, id: string): string {
  username = username.trim().slice(0, 16)

  if (/^\w+$/.test(username)) return username
  if (username.includes(' ')) return username.split(' ')[0]

  return id
}
