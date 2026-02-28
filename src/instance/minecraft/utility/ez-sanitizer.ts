export default class EzSanitizer {
  public process(message: string): string {
    const regex = /(?<!\w)ez(?!\w)/g
    message = message.replaceAll(regex, '_ez') // it is on purpose that this checks word boundary
    message = message.replaceAll('ezpz', 'ezp_z') // and this one does NOT.
    return message
  }
}
