import {Message} from "discord.js"

const emojisMap = require("emoji-name-map")

function cleanGuildEmoji(message: string) {
    return message.replace(/<:(\w+):\d{16,}>/g, match => {
        return match
            .substring(1, match.length - 1)
            .replace(/\d{16,}/g, "")
    })
}

function cleanStandardEmoji(message: string) {
    for (const [emojiReadable, emojiUnicode] of Object.entries(emojisMap.emoji)) {
        message = message.replaceAll(<string>emojiUnicode, `:${emojiReadable}:`)
    }

    return message
}

export function cleanMessage(messageEvent: Message) {
    let content = messageEvent.cleanContent

    content = cleanGuildEmoji(content)
    content = cleanStandardEmoji(content).trim()

    if (messageEvent.attachments) {
        messageEvent.attachments.forEach(attachment => {
            if (attachment.contentType?.includes("image")) {
                content += ` ${attachment.url}`
            } else {
                content += ` (ATTACHMENT)`
            }
        })
    }

    return content
}

export const escapeDiscord = function (message: string) {
    if (!message) return ""

    message = message.split('\\').join('\\\\') // "\"
    message = message.split('_').join('\\_') // Italic
    message = message.split('*').join('\\*') // bold
    message = message.split('~').join('\\~') // strikethrough
    message = message.split('`').join('\\`') // code
    message = message.split('@').join('\\@-') // mentions

    return message
}

export const getReplyUsername = async function (messageEvent: Message) {
    if (!messageEvent.reference || !messageEvent.reference.messageId) return

    let replyMessage = await messageEvent.channel.messages.fetch(messageEvent.reference.messageId)
    if (replyMessage.webhookId) return replyMessage.author.username

    if (!messageEvent.guild) return
    let guildMember = await messageEvent.guild.members.fetch(replyMessage.author.id)
    return guildMember.displayName
}

export const getReadableName = function (username: string, id: string) {
    username = username.trim().slice(0, 16)

    if (/^\w+$/.test(username)) return username
    if (username.includes(" ")) return username.split(" ")[0]

    return id
}
