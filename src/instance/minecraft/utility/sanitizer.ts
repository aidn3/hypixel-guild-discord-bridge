import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { ConfigManager } from '../../../common/config-manager.js'

import Antispam from './antispam.js'
import ArabicFixer from './arabic-fixer.js'
import EmojiSanitizer from './emoji-sanitizer.js'
import EzSanitizer from './ez-sanitizer.js'
import LineSanitizer from './line-sanitizer.js'
import { LinksSanitizer } from './links-sanitizer.js'

export class Sanitizer {
  private readonly config: ConfigManager<SanitizerConfig>

  private readonly line: LineSanitizer
  private readonly link: LinksSanitizer
  private readonly emoji: EmojiSanitizer
  private readonly ez: EzSanitizer
  private readonly arabicFixer: ArabicFixer
  private readonly antispam: Antispam

  constructor(application: Application, logger: Logger) {
    this.config = new ConfigManager(application, logger, application.getConfigFilePath('minecraft-antispam.json'), {
      hideLinksViaStuf: false,
      resolveHideLinks: true,

      antispamEnabled: true,
      antispamMaxAdditions: Antispam.MaxAdditions
    })

    this.line = new LineSanitizer()
    this.link = new LinksSanitizer(this.config)
    this.emoji = new EmojiSanitizer()
    this.ez = new EzSanitizer()
    this.arabicFixer = new ArabicFixer()
    this.antispam = new Antispam(this.config)
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

  public getConfig(): ConfigManager<SanitizerConfig> {
    return this.config
  }
}

export interface SanitizerConfig {
  hideLinksViaStuf: boolean
  resolveHideLinks: boolean

  antispamEnabled: boolean
  antispamMaxAdditions: number
}
