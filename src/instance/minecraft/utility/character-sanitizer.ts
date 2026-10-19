export default class CharacterSanitizer {
  public process(message: string): string {
    return message.replaceAll(/\s+/g, ' ').trim()
  }
}
