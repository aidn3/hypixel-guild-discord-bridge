export class CodecSanitizer {
  public process(message: string): string {
    return message.replaceAll('§', '')
  }
}
