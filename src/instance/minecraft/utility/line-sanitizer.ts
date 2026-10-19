export default class LineSanitizer {
  public process(message: string): string {
    return message
      .split(/[\n\r]+/g)
      .map((s) => s.trim())
      .join(' ')
      .trim()
  }
}
