export default class LineSanitizer {
  public process(message: string): string {
    return message
      .split('\n')
      .map((s) => s.trim())
      .join(' ')
      .trim()
  }
}
