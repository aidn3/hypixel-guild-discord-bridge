import Application from '../Application'
import { MinecraftRawChatEvent } from '../common/ApplicationEvent'
import PluginInterface from '../common/PluginInterface'
import { ClientInstance } from '../common/ClientInstance'
import { Client } from 'hypixel-api-reborn'
import ClusterHelper from '../ClusterHelper'

import * as log4js from 'log4js'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Mojang = require('mojang')

interface FragbotConfig {
  autoLeavePartyAfter: number
  whitelistGuild: boolean
  whitelisted: string[]
}

class FragbotPlugin {
  private readonly logger = log4js.getLogger('FragbotPlugin')
  private readonly config: FragbotConfig = require('../../config/fragbot-config.json')

  private readonly instanceName
  private readonly hypixelApi: Client
  private readonly clusterHelper: ClusterHelper

  private readonly queue: string[] = []

  constructor (instanceName: string, clusterHelper: ClusterHelper, hypixelApi: Client) {
    this.instanceName = instanceName
    this.clusterHelper = clusterHelper
    this.hypixelApi = hypixelApi
  }

  async loop (): Promise<never> {
    // meant to always check for new entries in queue
    // thought of using sleep using promise and resolve() it when adding new player
    // idea dropped to avoid race condition
    // opted for just sleep instead of writing complicated code that fixes race condition
    // noinspection InfiniteLoopJS
    while (true) {
      if (this.queue.length > 0) {
        const username = this.queue.shift() as string
        this.clusterHelper.sendCommandToMinecraft(this.instanceName, `/p accept ${username}`)

        await new Promise(resolve => setTimeout(resolve, this.config.autoLeavePartyAfter))
        this.clusterHelper.sendCommandToMinecraft(this.instanceName, '/p leave')
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  async partyInvite (message: string): Promise<void> {
    const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has invited you to join their party!$/gm

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]
      this.logger.debug(`${username} has sent a party invite`)

      if (this.config.whitelisted.some((p: string) => p.toLowerCase().trim() === username.toLowerCase().trim())) {
        this.logger.debug(`accepting ${username}'s party since they are whitelisted`)
        this.queue.push(username)
      } else if (this.config.whitelistGuild && await this.isGuildMember(username)) {
        this.logger.debug(`accepting ${username}'s party since they are from the same guild`)
        this.queue.push(username)
      } else {
        this.logger.debug(`ignoring ${username}'s party...`)
      }
    }
  }

  private async isGuildMember (username: string): Promise<boolean> {
    const uuid = await Mojang.lookupProfileAt(username).then((res: any) => res.id.toString())

    const members = await this.hypixelApi.getGuild('player', uuid, {})
      .then(res => res.members)

    // bot in same guild
    const botsUuid = this.clusterHelper.getMinecraftBotsUuid()
    return members.some(member => botsUuid.some(botUuid => botUuid === member.uuid))
  }
}

export default {
  onRun (app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined): any {
    const fragbotMap = new Map<string, FragbotPlugin>()

    app.on('minecraftChat', (event: MinecraftRawChatEvent) => {
      // only local instances are affected by their local plugins
      const minecraftInstance = getLocalInstance(event.instanceName)
      if (minecraftInstance == null) return

      let fragbot = fragbotMap.get(event.instanceName)
      if (fragbot == null) {
        fragbot = new FragbotPlugin(event.instanceName, app.clusterHelper, app.hypixelApi)
        fragbotMap.set(event.instanceName, fragbot)
        void fragbot.loop().then()
      }

      void fragbot.partyInvite(event.message)
    })
  }
} satisfies PluginInterface
