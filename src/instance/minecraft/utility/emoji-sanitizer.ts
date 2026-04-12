import EmojisMap from 'emoji-name-map'

export default class EmojiSanitizer {
  public process(message: string): string {
    message = this.substituteEmoji(message)
    message = this.cleanStandardEmoji(message)
    return message
  }

  private substituteEmoji(message: string): string {
    const map = new Map<string, string[]>()
    map.set('❤', '❤️ 💟 ♥️ 🖤 💙 🤎 💝 💚 🩶 🩵 🧡 🩷 💜 💖 🤍 💛 💓 💗 💕'.split(' '))
    map.set('❣', '❣️'.split(' '))
    map.set('☠', '💀 ☠️'.split(' '))

    for (const [substitute, convertEmojis] of map) {
      for (const convertEmoji of convertEmojis) {
        message = message.replaceAll(convertEmoji, substitute)
      }
    }

    return message
  }

  private cleanStandardEmoji(message: string): string {
    const AllowedString =
      '☺ ☹ ☠ ❣ ❤ ✌ ☝ ✍ ♨ ✈ ⌛ ⌚ ☀ ☁ ☂ ❄ ☃ ☄ ♠ ♥ ♦ ♣ ♟ ☎ ⌨ ✉ ✏ ✒ ✂ ☢ ☣ ' +
      '⬆ ⬇ ➡ ⬅ ↗ ↘ ↙ ↖ ↕ ↔ ↩ ↪ ✡ ☸ ☯ ✝ ☦ ☪ ☮ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ▶ ◀ ♀ ♂ ✖ ‼ 〰 ☑ ✔ ✳ ✴ ' +
      '❇ © ® ™ Ⓜ ㊗ ㊙ ▪ ▫ ☷ ☵ ☶ ☋ ☌ ♜ ♕ ♡ ♬ ☚ ♮ ♝ ♯ ☴ ♭ ☓ ☛ ☭ ♢ ✐ ♖ ☈ ☒ ★ ♚ ♛ ✎ ♪ ☰ ☽ ☡ ☼ ♅ ☐ ☟ ❦ ☊ ' +
      '☍ ☬ 7 ♧ ☫ ☱ ☾ ☤ ❧ ♄ ♁ ♔ ❥ ☥ ☻ ♤ ♞ ♆ # ♃ ♩ ☇ ☞ ♫ ☏ ♘ ☧ ☉ ♇ ☩ ♙ ☜ ☲ ☨ ♗ ☳ ⚔ ☕ ⚠'

    const AllowedEmojis = new Set(AllowedString.split(' '))
    const emojis = Object.entries(EmojisMap.emoji).filter(([, unicode]) => !AllowedEmojis.has(unicode))
    for (const [emojiReadable, emojiUnicode] of emojis) {
      message = message.replaceAll(emojiUnicode, `:${emojiReadable}:`)
    }

    return message
  }
}
