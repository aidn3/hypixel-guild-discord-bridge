export default class DiscordSanitizer {
  public process(message: string): string {
    // regex is done to be case-insensitive except for the letter to replace:
    // - positive lookbehind with case-insensitive for "d"
    // - literal letter to replace, either "i" or "I" and replace it with a similar looking letter
    // - positive lookahead with case-insensitive "scord"
    let result = message.replaceAll(/(?<=(?i:d))i(?=(?i:scord))/g, 'і')
    result = result.replaceAll(/(?<=(?i:d))I(?=(?i:scord))/g, 'І')
    return result
  }
}
