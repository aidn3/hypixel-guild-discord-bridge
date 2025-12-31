import assert from 'node:assert'

import DefaultAxios from 'axios'
import PromiseQueue from 'promise-queue'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Fairysouls extends ChatCommandHandler {
  private static readonly MaxLife = Duration.hours(6)
  private static readonly Url =
    'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/refs/heads/master/constants/fairy_souls.json'

  private readonly singletonPromise = new PromiseQueue(1)
  private fetchedAt = -1
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private result: { 'Max Souls': number } | undefined

  constructor() {
    super({
      triggers: ['fairysouls', 'fairysoul', 'fairy', 'fs'],
      description: "Returns a player's Skyblock fairysouls progress",
      example: `fairy %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const stat = selectedProfile.fairy_soul?.total_collected ?? 0

    await this.singletonPromise.add(() => this.tryUpdate())
    assert.ok(this.result !== undefined)

    return `${givenUsername} Fairysouls: ${stat} / ${this.result['Max Souls']}`
  }
  private async tryUpdate(): Promise<void> {
    if (this.fetchedAt + Fairysouls.MaxLife.toMilliseconds() < Date.now()) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      this.result = await DefaultAxios.get<{ 'Max Souls': number }>(Fairysouls.Url).then((response) => response.data)
      this.fetchedAt = Date.now()
    }
  }
}
