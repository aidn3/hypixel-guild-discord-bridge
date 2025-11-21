import type Application from '../../../application.js'

import Antispam from './antispam.js'
import ArabicFixer from './arabic-fixer.js'
import EmojiSanitizer from './emoji-sanitizer.js'
import EzSanitizer from './ez-sanitizer.js'
import LineSanitizer from './line-sanitizer.js'
import { LinksSanitizer } from './links-sanitizer.js'

export class Sanitizer {
  private readonly line: LineSanitizer
  private readonly link: LinksSanitizer
  private readonly emoji: EmojiSanitizer
  private readonly ez: EzSanitizer
  private readonly arabicFixer: ArabicFixer
  private readonly antispam: Antispam

  constructor(application: Application) {
    this.line = new LineSanitizer()
    this.link = new LinksSanitizer(application.core.minecraftConfigurations)
    this.emoji = new EmojiSanitizer()
    this.ez = new EzSanitizer()
    this.arabicFixer = new ArabicFixer()
    this.antispam = new Antispam(application.core.minecraftConfigurations)
  }

  public async sanitizeChatMessage(instanceName: string, message: string): Promise<string> {
    message = this.line.process(message)
    message = await this.link.process(message)
    message = this.emoji.process(message)
    message = this.ez.process(message)
    message = this.arabicFixer.encode(message)
    message = this.antispam.process(instanceName, message)

    return message
  }

  public sanitizeGenericCommand(message: string): string {
    return this.line.process(message)
  }
}
