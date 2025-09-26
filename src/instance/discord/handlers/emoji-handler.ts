import { hash } from 'node:crypto'
import fs from 'node:fs/promises'

import type { ApplicationEmojiManager, Client } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { ConfigManager } from '../../../common/config-manager.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { AllEmojis } from '../common/discord-config.js'
import type DiscordInstance from '../discord-instance.js'

export default class EmojiHandler extends EventHandler<DiscordInstance, InstanceType.Discord, Client> {
  private readonly registeredEmoji: ConfigManager<EmojiConfig>

  public constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.registeredEmoji = new ConfigManager(
      application,
      logger,
      application.getConfigFilePath('discord-registered-emoji.json'),
      { savedEmojis: [] }
    )
  }

  override registerEvents(client: Client): void {
    client.on('clientReady', (readyClient) => {
      void this.registerEmojis(readyClient.application.emojis).catch(
        this.errorHandler.promiseCatch('registering emojis in guild')
      )
    })
  }

  private async registerEmojis(manager: ApplicationEmojiManager): Promise<void> {
    const registeredEmojis = await manager.fetch()
    for (const emoji of AllEmojis) {
      this.logger.trace(`Checking emoji ${emoji.name}`)
      const imageData = await fs.readFile(emoji.path)
      const imageHash = hash('sha256', imageData, 'hex')
      const registeredEmoji = registeredEmojis.find((existingEmoji) => existingEmoji.name === emoji.name)
      const savedEmoji = this.registeredEmoji.data.savedEmojis.find((savedEmoji) => savedEmoji.name === emoji.name)

      if (registeredEmoji !== undefined) {
        if (savedEmoji?.hash === imageHash) {
          this.logger.trace(`Emoji ${emoji.name} is registered already and matches the resource file. skipping...`)
          continue
        }

        if (savedEmoji === undefined) {
          this.logger.warn(
            `The emoji ${emoji.name} is registered but is somehow not saved in the configuration file. ` +
              'There is no way to prove the emoji validity. ' +
              'The registered emoji will be deleted and replaced with the emoji from the resource file ' +
              'before properly saving it in the configuration for future checking.'
          )
        } else {
          this.logger.warn('Registered emoji does not match the emoji in the resource file')
          this.logger.warn('Deleting the registered emoji before trying to register the new the new one')
        }

        await manager.delete(registeredEmoji)
      }

      this.logger.info(`Registering emoji=${emoji.path} under the name ${emoji.name}`)
      await manager.create({ name: emoji.name, attachment: imageData })

      let savedEmojis = this.registeredEmoji.data.savedEmojis
      savedEmojis = savedEmojis.filter((savedEmoji) => savedEmoji.name !== emoji.name)
      savedEmojis.push({ name: emoji.name, hash: imageHash })
      this.registeredEmoji.data.savedEmojis = savedEmojis
      this.registeredEmoji.markDirty()
    }
  }
}

interface EmojiConfig {
  savedEmojis: { name: string; hash: string }[]
}
