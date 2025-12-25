import type { ChatEvent } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Timeout } from '../../../utility/timeout.js'

const UnscrambleWords = [
  // Minecraft
  ...'creeper diamond enderman ghast iron lava obsidian pig redstone zombie blaze skeleton spider cave emerald gold nether villager witch armor bow arrow enchantment torch minecart coal furnace pickaxe shovel'.split(
    ' '
  ),

  // Hypixel Network
  ...'bedwars skywars buildbattle duels murdermystery skyblock bazaar hypixel thirtyvirus tntgames refraction rat duck duckysolucky ducky skyhelper skycrypt flexingchimps fcontop capturetheflag survivalgames thebridge paintball arcade rank tournament hyperion terminator dungeons catacombs voidgloom revenant tarantula valkyrie astraea scylla storm goldor necron maxor kuudra simon hypixel minion farming fishing combat alchemy enchanting foraging mining taming social runecrafting garden gauntlet minikloon dctr_space_helmet networth ratfraction mattthecuber altpapier headhunter anderle02 nomtheratter nom nomthethirtyvirus2.0 enderdragon dragon goldendragon bal sheep phoenix crimson creativemind claymore clover bingo duckyfie divan sosflare hypixelskyblock ihatedowntime adminsfixbugs newupdatewhen veteran level aurora bat downtime grass girl woman backpack jujunons juju nons youtuber contraband spotify youtube twitch skillaverage classes monkeyfinder monkefinder monke euclid scythe drill cookie p2w skyblockgems gems coins bits shower sleep axe inferno katana bad_dev pioneer pickaxe wisp shrooms snow artifact'.split(
    ' '
  ),

  // Basic English
  ...'apple banana cat dog elephant fish grape happy jump kite lion music new orange queen red sun tree umbrella vase water yellow zoo book chair desk eraser flower garden hat ice jungle key lake moon night ocean pizza quiet river snake table umbrella volcano window yellow zebra'.split(
    ' '
  ),

  // Other random words
  ...'basket candle dolphin eleven fridge guitar hamburger island jacket kangaroo lemon mountain notebook ocean pencil quilt rainbow sunglasses telephone vegetable xylophone yogurt zebra airport backpack calendar diamond electricity festival garden history internet jellyfish kitchen language medicine notebook oxygen parade question restaurant science telephone university vegetarian window'.split(
    ' '
  )
]

function getRandomWord(length?: number): string {
  if (length !== undefined) {
    const filteredWords = UnscrambleWords.filter((word) => word.length === length)
    if (filteredWords.length === 0) {
      throw new Error(`No words found with ${length} characters.`)
    }

    return filteredWords[Math.floor(Math.random() * filteredWords.length)]
  }

  return UnscrambleWords[Math.floor(Math.random() * UnscrambleWords.length)]
}

function shuffle<T>(array: T[]): T[] {
  for (let index = array.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[array[index], array[randomIndex]] = [array[randomIndex], array[index]]
  }
  return array
}

function scrambleWord(word: string): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const scrambled = shuffle(word.split('')).join('')
    if (scrambled !== word) return scrambled
  }

  return word.split('').reverse().join('')
}

export default class Unscramble extends ChatCommandHandler {
  private static readonly GameDuration = 30_000
  private static readonly ActiveGames = new Map<string, number>()

  constructor() {
    super({
      triggers: ['unscramble', 'unscrambleme', 'us'],
      description: 'Unscramble the word and type it in chat to win!',
      example: `unscramble [length]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const gameKey = `${context.message.instanceType}:${context.message.instanceName}`
    const now = Date.now()
    const activeGameStartedAt = Unscramble.ActiveGames.get(gameKey)
    if (activeGameStartedAt && now - activeGameStartedAt < Unscramble.GameDuration) {
      return 'Please wait until current game is over.'
    }

    const lengthArgument = context.args[0]
    const length = lengthArgument && /^\d+$/.test(lengthArgument) ? Number.parseInt(lengthArgument, 10) : undefined

    let answer: string
    try {
      answer = getRandomWord(length)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `[ERROR] ${message}`
    }

    const scrambledWord = scrambleWord(answer)
    const timeout = new Timeout<ChatEvent>(Unscramble.GameDuration)
    const startTime = Date.now()
    Unscramble.ActiveGames.set(gameKey, startTime)

    const listener = (event: ChatEvent) => {
      if (event.instanceType !== context.message.instanceType) return
      if (event.instanceName !== context.message.instanceName) return
      if (event.channelType !== context.message.channelType) return

      const lastWord = event.message.trim().split(/\s+/).pop()?.toLowerCase() ?? ''
      if (lastWord === answer) timeout.resolve(event)
    }

    context.app.on('chat', listener)
    try {
      await context.sendFeedback(`Unscramble: "${scrambledWord}"`)
      timeout.refresh()

      const result = await timeout.wait()
      if (!result) {
        return `Time's up! The answer was ${answer}`
      }

      const elapsed = (Date.now() - startTime).toLocaleString()
      return `${result.user.displayName()} guessed it right! Time elapsed: ${elapsed}ms!`
    } finally {
      context.app.off('chat', listener)
      Unscramble.ActiveGames.delete(gameKey)
    }
  }
}
