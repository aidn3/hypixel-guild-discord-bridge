import assert from 'node:assert'

import esrever from 'esrever'

import type { MinecraftConfigurations } from '../../../core/minecraft/minecraft-configurations'

export default class ArabicFixer {
  constructor(private readonly config: MinecraftConfigurations) {}
  public encode(message: string): string {
    const enabled = this.config.getArabicFixerEnabled()
    if (!enabled) return message

    const ArabicLanguage = /[\u0600-\u06FF\u200C\u200F\uFB8A]+/g
    if (!ArabicLanguage.test(message)) return message

    return this.smartReverse(message)
  }

  private regexSegment(message: string): { content: string; isArabic: boolean }[] {
    message = message.trim() // needed to simplify detecting "filler"

    const segments: { content: string; isArabic: boolean }[] = []
    const regex = /(?!\s)[\s\u0600-\u06FF\u200C\u200F\uFB8A]+(?![\u0600-\u06FF\u200C\u200F\uFB8A])/gm
    // eslint-disable-next-line unicorn/no-null
    let match: RegExpMatchArray | null = null
    let totalLength = 0
    while ((match = regex.exec(message)) !== null) {
      const segment = match[0]
      const index = match.index
      const length = segment.length
      assert.ok(index !== undefined)

      if (totalLength < index) {
        const missedSegment = message.slice(totalLength, index)
        segments.push({ content: missedSegment, isArabic: false })
      }

      segments.push({ content: message.slice(index, index + length), isArabic: true })
      totalLength = index + length
    }

    if (totalLength < message.length) {
      segments.push({ content: message.slice(totalLength), isArabic: false })
    }

    return segments
  }

  private smartReverse(message: string): string {
    const segments = this.regexSegment(message)

    let reversedMessage = ''
    for (const segment of segments.toReversed()) {
      if (segment.isArabic) {
        const translatedSegment = this.translate(segment.content)
        reversedMessage += esrever.reverse(translatedSegment).trim() + ' '
      } else {
        reversedMessage += segment.content.trim() + ' '
      }
    }

    return reversedMessage.trim()
  }

  private translate(message: string): string {
    let changed = false
    let newMessage = message
    do {
      changed = false
      for (const rule of ArabicFixer.compilePatterns()) {
        const changedMessage = newMessage.replaceAll(rule.regex, rule.replace)
        if (newMessage !== changedMessage) {
          newMessage = changedMessage
          changed = true
        }
      }
    } while (changed)

    return newMessage
  }

  // Credit: https://github.com/omd0/Arabic-Fixer
  private static compilePatterns(): { regex: RegExp; replace: string }[] {
    const nonJoinerLetters = 'ﺬآداﺇﺁﺃﺎﺈﺂﺄرﺮزﺰژﮋذﺲﺶﺺﺾوﭗﺚﺖﺞﭻﺢﺦﺐﻂﻆﻊﻎﻒﻖﮏﮓﻚﻞﻢﻦﻮﻪﻰﺊﻲﺪﻼﻻﻺﻹﻶﻵﻸﻷﷺﷲﺔﻪﺅ'
    const nospaceAfter = String.raw`(?!\s|$|^)`
    const spaceAfter = String.raw`(?=\s|^|$)`
    const nonJoinerRegex = String.raw`(?<!\s|^|$|[` + nonJoinerLetters + '])'
    const isnonJoinerRegex = String.raw`(?<=\s|^|$|[` + nonJoinerLetters + '])'
    const JoinerRegex = String.raw`(?<!\s\w[^` + nonJoinerLetters + '])'

    const allRules: { regex: RegExp; replace: string }[] = []
    allRules.push({ regex: new RegExp(spaceAfter + 'الله', 'g'), replace: 'ﷲ' }) //الله
    allRules.push({ regex: new RegExp(spaceAfter + 'الله' + spaceAfter, 'g'), replace: 'ﷲ' }) //الله
    allRules.push({ regex: new RegExp(spaceAfter + 'صلى', 'g'), replace: 'ﷺ' }) //ﷺ
    allRules.push({ regex: new RegExp('لإ', 'g'), replace: 'ﻹ' }) //إ
    allRules.push({ regex: new RegExp(JoinerRegex + 'ﻹ', 'g'), replace: 'ﻺ' })
    allRules.push({ regex: new RegExp('لآ', 'g'), replace: 'ﻵ' }) //آ
    allRules.push({ regex: new RegExp(JoinerRegex + 'ﻵ', 'g'), replace: 'ﻶ' })
    allRules.push({ regex: new RegExp('لأ', 'g'), replace: 'ﻷ' }) //أ
    allRules.push({ regex: new RegExp(JoinerRegex + 'ﻷ', 'g'), replace: 'ﻸ' })
    allRules.push({ regex: new RegExp('لا', 'g'), replace: 'ﻻ' }) //ا
    allRules.push({ regex: new RegExp(JoinerRegex + 'ﻼ' + spaceAfter, 'g'), replace: 'ﻼ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ا', 'g'), replace: 'ﺎ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ب' + nospaceAfter, 'g'), replace: 'ﺒ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ب' + nospaceAfter, 'g'), replace: 'ﺑ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ب' + spaceAfter, 'g'), replace: 'ﺐ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'پ' + nospaceAfter, 'g'), replace: 'ﭙ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'پ' + nospaceAfter, 'g'), replace: 'ﭘ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'پ' + spaceAfter, 'g'), replace: 'ﭗ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ت' + nospaceAfter, 'g'), replace: 'ﺘ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ت' + nospaceAfter, 'g'), replace: 'ﺗ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ت' + spaceAfter, 'g'), replace: 'ﺖ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ث' + nospaceAfter, 'g'), replace: 'ﺜ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ث' + nospaceAfter, 'g'), replace: 'ﺛ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ث' + spaceAfter, 'g'), replace: 'ﺚ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ج' + nospaceAfter, 'g'), replace: 'ﺠ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ج' + nospaceAfter, 'g'), replace: 'ﺟ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ج' + spaceAfter, 'g'), replace: 'ﺞ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'چ' + nospaceAfter, 'g'), replace: 'ﭽ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'چ' + nospaceAfter, 'g'), replace: 'ﭼ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'چ' + spaceAfter, 'g'), replace: 'ﭻ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ح' + nospaceAfter, 'g'), replace: 'ﺤ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ح' + nospaceAfter, 'g'), replace: 'ﺣ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ح' + spaceAfter, 'g'), replace: 'ﺢ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'خ' + nospaceAfter, 'g'), replace: 'ﺨ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'خ' + nospaceAfter, 'g'), replace: 'ﺧ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'خ' + spaceAfter, 'g'), replace: 'ﺦ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'د' + spaceAfter, 'g'), replace: 'ﺪ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ذ' + spaceAfter, 'g'), replace: 'ﺬ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ر' + spaceAfter, 'g'), replace: 'ﺮ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ز' + spaceAfter, 'g'), replace: 'ﺰ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ژ' + spaceAfter, 'g'), replace: 'ﮋ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'س' + nospaceAfter, 'g'), replace: 'ﺴ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'س' + nospaceAfter, 'g'), replace: 'ﺳ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'س' + spaceAfter, 'g'), replace: 'ﺲ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ش' + nospaceAfter, 'g'), replace: 'ﺸ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ش' + nospaceAfter, 'g'), replace: 'ﺷ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ش' + spaceAfter, 'g'), replace: 'ﺶ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ص' + nospaceAfter, 'g'), replace: 'ﺼ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ص' + nospaceAfter, 'g'), replace: 'ﺻ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ص' + spaceAfter, 'g'), replace: 'ﺺ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ض' + nospaceAfter, 'g'), replace: 'ﻀ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ض' + nospaceAfter, 'g'), replace: 'ﺿ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ض' + spaceAfter, 'g'), replace: 'ﺾ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ط' + nospaceAfter, 'g'), replace: 'ﻄ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ط' + nospaceAfter, 'g'), replace: 'ﻃ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ط' + spaceAfter, 'g'), replace: 'ﻂ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ظ' + nospaceAfter, 'g'), replace: 'ﻈ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ظ' + nospaceAfter, 'g'), replace: 'ﻇ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ظ' + spaceAfter, 'g'), replace: 'ﻆ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ع' + nospaceAfter, 'g'), replace: 'ﻌ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ع' + nospaceAfter, 'g'), replace: 'ﻋ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ع' + spaceAfter, 'g'), replace: 'ﻊ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'غ' + nospaceAfter, 'g'), replace: 'ﻐ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'غ' + nospaceAfter, 'g'), replace: 'ﻏ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'غ' + spaceAfter, 'g'), replace: 'ﻎ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ف' + nospaceAfter, 'g'), replace: 'ﻔ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ف' + nospaceAfter, 'g'), replace: 'ﻓ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ف' + spaceAfter, 'g'), replace: 'ﻒ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ق' + nospaceAfter, 'g'), replace: 'ﻘ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ق' + nospaceAfter, 'g'), replace: 'ﻗ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ق' + spaceAfter, 'g'), replace: 'ﻖ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ک' + nospaceAfter, 'g'), replace: 'ﮑ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ک' + nospaceAfter, 'g'), replace: 'ﮐ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ک' + spaceAfter, 'g'), replace: 'ﮏ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ك' + nospaceAfter, 'g'), replace: 'ﻜ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ك' + nospaceAfter, 'g'), replace: 'ﻛ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ك' + spaceAfter, 'g'), replace: 'ﻚ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'گ' + nospaceAfter, 'g'), replace: 'ﮕ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'گ' + nospaceAfter, 'g'), replace: 'ﮔ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'گ' + spaceAfter, 'g'), replace: 'ﮓ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ل' + nospaceAfter, 'g'), replace: 'ﻠ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ل' + nospaceAfter, 'g'), replace: 'ﻟ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ل' + spaceAfter, 'g'), replace: 'ﻞ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'م' + nospaceAfter, 'g'), replace: 'ﻤ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'م' + nospaceAfter, 'g'), replace: 'ﻣ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'م' + spaceAfter, 'g'), replace: 'ﻢ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ن' + nospaceAfter, 'g'), replace: 'ﻨ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ن' + nospaceAfter, 'g'), replace: 'ﻧ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ن' + spaceAfter, 'g'), replace: 'ﻦ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'و' + spaceAfter, 'g'), replace: 'ﻮ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ه' + nospaceAfter, 'g'), replace: 'ﻬ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ه' + nospaceAfter, 'g'), replace: 'ﻫ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ه' + spaceAfter, 'g'), replace: 'ﻪ' })
    allRules.push({ regex: new RegExp(isnonJoinerRegex + 'ه' + spaceAfter, 'g'), replace: 'ﮦ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ی' + nospaceAfter, 'g'), replace: 'ﻴ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ی' + nospaceAfter, 'g'), replace: 'ﻳ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ی' + spaceAfter, 'g'), replace: 'ﻰ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ي' + nospaceAfter, 'g'), replace: 'ﻴ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ي' + nospaceAfter, 'g'), replace: 'ﻳ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ي' + spaceAfter, 'g'), replace: 'ﻲ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ي' + nospaceAfter, 'g'), replace: 'ﺌ' })
    allRules.push({ regex: new RegExp(JoinerRegex + 'ي' + nospaceAfter, 'g'), replace: 'ﺋ' })
    allRules.push({ regex: new RegExp(nonJoinerRegex + 'ي' + spaceAfter, 'g'), replace: 'ﺊ' })

    return allRules
  }
}
