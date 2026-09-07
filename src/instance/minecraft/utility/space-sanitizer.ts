export default class SpaceSanitizer {
  public process(message: string): string {
    return message
      .split(
        // Based on: https://www.compart.com/en/unicode/category/Zs
        /[\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]+/gu
      )
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(' ')
      .trim()
  }
}
