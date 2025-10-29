import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class Buildbattle extends ChatCommandHandler {
  // TODO: @Kathund move this into Hypixel-API-Reborn See https://discord.com/channels/@me/1427156824645439488/1432985264959262802
  private static readonly Titles = [
    { value: 0, score: 'Rookie' },
    { value: 100, score: 'Untrained' },
    { value: 250, score: 'Amatuer' },
    { value: 550, score: 'Prospect' },
    { value: 1000, score: 'Apprentice' },
    { value: 2000, score: 'Experienced' },
    { value: 3500, score: 'Seasoned' },
    { value: 5000, score: 'Trained' },
    { value: 7500, score: 'Skilled' },
    { value: 10_000, score: 'Talented' },
    { value: 15_000, score: 'Professional' },
    { value: 20_000, score: 'Artisan' },
    { value: 30_000, score: 'Expert' },
    { value: 50_000, score: 'Master' },
    { value: 100_000, score: 'Legend' },
    { value: 200_000, score: 'Grandmaster' },
    { value: 300_000, score: 'Celestial' },
    { value: 400_000, score: 'Divine' },
    { value: 500_000, score: 'Ascended' },
    { value: 400_000, score: 'Divine' }
  ]

  constructor() {
    super({
      triggers: ['buildbattle', 'build', 'bb'],
      description: "Returns a player's Build Battle common stats",
      example: `bb %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined || player.isRaw()) return `${givenUsername} has never played on Hypixel before?`

    const score = player.stats.BuildBattle.score
    const wins =
      player.stats.BuildBattle.wins.gtb +
      player.stats.BuildBattle.wins.pro +
      player.stats.BuildBattle.wins.solo +
      player.stats.BuildBattle.wins.teams
    const title = await this.getTitle(context, uuid, score)

    return `${title} ${givenUsername}'s Build Battle score is ${score.toLocaleString('en-US')} with ${wins.toLocaleString('en-US')} Wins.`
  }

  private async getTitle(context: ChatCommandContext, uuid: string, score: number): Promise<string> {
    // Check if they deserve the special leaderboard title
    const leaderboards = await context.app.hypixelApi.getLeaderboards()
    if (leaderboards.isRaw()) throw new Error("Something wen't wrong while fetching leaderboards")

    const buildBattleLeaderboard = leaderboards.BUILD_BATTLE.find(
      (leaderboard) => leaderboard.prefix === 'Lifetime' && leaderboard.title === 'Score'
    )
    assert.ok(buildBattleLeaderboard !== undefined)

    // UUID without dashes
    const top10Leaderboard = buildBattleLeaderboard.leaders.map((entry) => entry.replaceAll('-', '')).slice(0, 10)

    for (const [index, topLeaderboard] of top10Leaderboard.entries()) {
      if (topLeaderboard === uuid) return `#${index + 1} Builder`
    }

    // fallback to normal titles
    let lastValidTitle = Buildbattle.Titles[0].score
    for (const entry of Buildbattle.Titles) {
      if (score >= entry.value) lastValidTitle = entry.score
    }

    return lastValidTitle
  }
}
