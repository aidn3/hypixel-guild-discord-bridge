import type Application from '../../../application.js'
import { ConfigManager } from '../../../common/config-manager.js'

import Antispam from './antispam.js'
import ArabicFixer from './arabic-fixer.js'
import EmojiSanitizer from './emoji-sanitizer.js'
import LineSanitizer from './line-sanitizer.js'
import { LinksSanitizer } from './links-sanitizer.js'

export class Sanitizer {
  private readonly config: ConfigManager<SanitizerConfig>

  private readonly line: LineSanitizer
  private readonly link: LinksSanitizer
  private readonly emoji: EmojiSanitizer
  private readonly arabic: ArabicFixer
  private readonly antispam: Antispam

  constructor(application: Application) {
    this.config = new ConfigManager(application, application.getConfigFilePath('minecraft-antispam.json'), {
      hideLinksViaStuf: false,
      resolveHideLinks: true,

      antispamEnabled: true,
      antispamMaxHistory: Antispam.MaxHistory,
      antispamSafeScore: Antispam.SafeScore,
      antispamMaxAdditions: Antispam.MaxAdditions
    })

    this.line = new LineSanitizer()
    this.link = new LinksSanitizer(this.config)
    this.emoji = new EmojiSanitizer()
    this.arabic = new ArabicFixer()
    this.antispam = new Antispam(this.config)
  }

  public async process(instanceName: string, message: string): Promise<string> {
    message = this.line.process(message)
    message = await this.link.process(message)
    message = this.emoji.process(message)
    message = this.arabic.encode(message)
    message = this.antispam.process(instanceName, message)

    return message
  }

  public getConfig(): ConfigManager<SanitizerConfig> {
    return this.config
  }
}

export interface SanitizerConfig {
  hideLinksViaStuf: boolean
  resolveHideLinks: boolean

  antispamEnabled: boolean
  antispamMaxHistory: number
  antispamSafeScore: number
  antispamMaxAdditions: number
}
