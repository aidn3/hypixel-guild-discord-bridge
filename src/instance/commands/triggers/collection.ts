import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { search } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Collection extends ChatCommandHandler {
  private static readonly Translator: Record<string, string> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    LOG: 'OAK_LOG',
    'LOG:1': 'SPRUCE_LOG',
    'LOG:2': 'BIRCH_LOG',
    'LOG:3': 'JUNGLE_LOG',

    LOG_2: 'ACACIA_LOG',
    'LOG_2:1': 'DARK_OAK_LOG',

    INK_SACK: 'INK_SACK',
    'INK_SACK:3': 'COCOA_BEANS',
    'INK_SACK:4': 'LAPIS_Lazuli',

    RAW_FISH: 'RAW_COD',
    'RAW_FISH:1': 'RAW_SALMON',
    'RAW_FISH:2': 'TROPICAL_FISH',
    'RAW_FISH:3': 'PUFFERFISH',

    SAND: 'SAND',
    'SAND:1': 'RED_SAND'
    /* eslint-enable @typescript-eslint/naming-convention */
  }
  constructor() {
    super({
      triggers: ['collection', 'collections'],
      description: "Returns a player's skyblock collection stats",
      example: `collection %s birch`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const collections = selectedProfile.collection
    if (collections === undefined) return `${givenUsername} has their Collections API disabled.`

    const query = context.args.slice(1).join(' ')
    const translated = new Map<string, string>()
    for (const collectionName of Object.keys(collections)) {
      translated.set(this.normalize(collectionName), collectionName)
    }

    const translatedWord = search(query, translated.keys().toArray()).at(0)
    if (translatedWord === undefined) return `${givenUsername} not such a collection: ${query}`

    const collectionKey = translated.get(translatedWord)
    assert.ok(collectionKey !== undefined)

    const collection = collections[collectionKey]
    const displayCollectionName = this.beautify(collectionKey)
    return `${givenUsername}'s ${displayCollectionName} collection: ${collection.toLocaleString('en-US')}.`
  }

  private normalize(word: string): string {
    const translated = Collection.Translator[word] as string | undefined
    if (translated !== undefined) word = translated
    return word.toLowerCase().replaceAll('_', ' ')
  }

  private beautify(word: string): string {
    const translated = Collection.Translator[word] as string | undefined
    if (translated !== undefined) word = translated
    return word
      .toLowerCase()
      .split('_')
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }
}
