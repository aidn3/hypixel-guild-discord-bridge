export default class DiscordSanitizer {
  public process(message: string): string {
    const regex = /(?<=d)i(?=scord)/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(message)) != undefined) {
      const letter = match[0]
      const replacement = letter === 'i' ? 'і' : 'І' // alternative letters
      message = message.slice(0, match.index) + replacement + message.slice(match.index + 1)
    }

    return message
  }
}
