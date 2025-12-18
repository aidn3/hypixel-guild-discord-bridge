/*
 * Credit: https://github.com/michelegera/devexcuses-api
 * License: https://github.com/michelegera/devexcuses-api/blob/main/LICENSE.txt
 */

import DefaultAxios from 'axios'
import PromiseQueue from 'promise-queue'
import Yaml from 'yaml'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'

export default class DevelopmentExcuse extends ChatCommandHandler {
  private static readonly MaxLife = Duration.hours(6)
  private static readonly DefaultLanguage = 'en'
  private static readonly Url =
    'https://raw.githubusercontent.com/michelegera/devexcuses-api/refs/heads/main/data/excuses.yml'

  private readonly singletonPromise = new PromiseQueue(1)
  private result: Record<string, string[]> = {}
  private fetchedAt = -1

  constructor() {
    super({
      triggers: ['devexcuse', 'devexc', 'dev'],
      description: "Show you a random excuse for why this bot isn't working",
      example: 'devexcuse'
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    await this.singletonPromise.add(() => this.tryUpdate())

    let message = "You're asking why it doesn't work?\n"
    const entries = this.result[context.app.i18n.language] ?? this.result[DevelopmentExcuse.DefaultLanguage]
    message += entries[Math.floor(Math.random() * entries.length)]

    return message
  }

  private async tryUpdate(): Promise<void> {
    if (this.fetchedAt + DevelopmentExcuse.MaxLife.toMilliseconds() < Date.now()) {
      const response = await DefaultAxios.get<string>(DevelopmentExcuse.Url)
      const formattedYaml = Yaml.parse(response.data) as Record<string, string | number>[]

      this.result = {}
      for (const entry of formattedYaml) {
        for (const [key, value] of Object.entries(entry)) {
          if (!key.startsWith('text_')) continue
          if (typeof value !== 'string') continue

          const language = key.slice('text_'.length)
          let entries = this.result[language] as string[] | undefined
          if (entries === undefined) {
            entries = []
            this.result[language] = entries
          }

          entries.push(value)
        }
      }

      this.fetchedAt = Date.now()
    }
  }
}
