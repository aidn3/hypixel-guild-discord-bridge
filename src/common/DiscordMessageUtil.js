const emojisMap = require("emoji-name-map");

function cleanGuildEmoji(message) {
    return message.replace(/<:(\w+):\d{16,}>/g, match => {
        let emoji = match
            .substring(1, match.length - 1)
            .replace(/\d{16,}/g, "")
        console.log(emoji)
        return emoji
    })
}

function cleanStandardEmoji(message) {
    for (const [emojiReadable, emojiUnicode] of Object.entries(emojisMap.emoji)) {
        message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
    }

    return message
}

function stripDiscordContent(message) {
    return message
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '\n')
        .split('\n')
        .map(part => {
            part = part.trim()
            return part.length === 0 ? '' : part + ' '
        })
        .join('')
}

function cleanMessage(messageEvent) {
    let content = messageEvent.cleanContent

    content = cleanGuildEmoji(content)
    content = cleanStandardEmoji(content)
    content = stripDiscordContent(content).trim()

    if (messageEvent.attachments) {
        messageEvent.attachments.forEach(attachment => {
            if (attachment.contentType.includes("image")) {
                content += ` ${attachment.url}`
            } else {
                content += ` (ATTACHMENT)`
            }
        })
    }

    return content
}

const escapeDiscord = function (message) {
    if (!message) return ""

    message = message.split('\\').join('\\\\') // "\"
    message = message.split('_').join('\\_') // Italic
    message = message.split('*').join('\\*') // bold
    message = message.split('~').join('\\~') // strikethrough
    message = message.split('`').join('\\`') // code
    message = message.split('@').join('\\@-') // mentions

    return message
}

const getReplyUsername = async function (messageEvent) {
    if (!messageEvent.reference) return

    let replyMessage = await messageEvent.channel.messages.fetch(messageEvent.reference.messageId)
    if (replyMessage.webhookId) return replyMessage.author.username

    let guildMember = await messageEvent.guild.members.fetch(replyMessage.author.id)
    return guildMember.displayName
}

module.exports = {cleanMessage, escapeDiscord, getReplyUsername}