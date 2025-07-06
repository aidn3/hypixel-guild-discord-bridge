export default class EzSanitizer {
  public process(message: string): string {
    const regex = /(?<!\w)ez(?!\w)/g
    return message.replaceAll(regex, '_ez')
  }
}
