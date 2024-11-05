/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import Axios, { type AxiosResponse } from 'axios'
import { getNetworth, getPrices } from 'skyhelper-networth'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/util.js'

export default class Networth extends ChatCommandHandler {
  private prices: object | undefined

  private priceUpdater: NodeJS.Timeout | undefined

  constructor() {
    super({
      name: 'Networth',
      triggers: ['networth', 'net', 'nw'],
      description: "Returns a calculation of a player's networth",
      example: `nw %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles?.find((p) => p.selected))
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    let museumData: object | undefined
    try {
      museumData = await Axios.get(
        `https://api.hypixel.net/skyblock/museum?key=${context.app.hypixelApi.key}&profile=${selectedProfile.profile_id}`
      )
        .then((response: AxiosResponse<HypixelSkyblockMuseumRaw, unknown>) => response.data)
        .then((museum) => museum.members[uuid] as object)
    } catch {
      return `${context.username}, error fetching museum data?`
    }

    await this.tryUpdatePrices(context.errorHandler)

    const networth = await getNetworth(selectedProfile.members[uuid], selectedProfile.banking?.balance ?? 0, {
      v2Endpoint: true,
      prices: this.prices,
      museumData: museumData,
      onlyNetworth: true
    })
      .then((response) => response.networth)
      .catch(() => undefined)
    if (networth === undefined) return `${context.username}, cannot calculate the networth?`

    return `${givenUsername}'s networth: ${this.localizedNetworth(networth)}`
  }

  private async tryUpdatePrices(errorHandler: UnexpectedErrorHandler): Promise<void> {
    if (!this.priceUpdater) {
      this.priceUpdater = setInterval(
        () => {
          void this.updatePrices().catch(errorHandler.promiseCatch('periodical price updating'))
        },
        1000 * 60 * 5
      ) // 5 minutes
    }

    if (!this.prices) await this.updatePrices()
  }

  private async updatePrices(): Promise<void> {
    this.prices = await getPrices()
  }

  private localizedNetworth(coins: number): string {
    let suffix = ''
    if (coins > 1000) {
      coins = coins / 1000
      suffix = 'k'
    }
    if (coins > 1000) {
      coins = coins / 1000
      suffix = 'm'
    }
    if (coins > 1000) {
      coins = coins / 1000
      suffix = 'b'
    }

    return coins.toFixed(3) + suffix
  }
}

interface HypixelSkyblockMuseumRaw {
  members: Record<string, unknown>
}
