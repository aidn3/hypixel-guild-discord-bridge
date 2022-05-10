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

module.exports = {cleanMessage}