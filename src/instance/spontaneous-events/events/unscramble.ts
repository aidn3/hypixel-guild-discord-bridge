import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color } from '../../../common/application-event'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import Duration from '../../../utility/duration'
import { Timeout } from '../../../utility/timeout'
import { type EventContext, shuffleArrayInPlace, SpontaneousEventHandler } from '../common'

export class Unscramble extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Unscramble)
  }

  override async startEvent(): Promise<void> {
    const context: EventContext = {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      broadcastMessage: (message, color) => this.broadcastMessage(message, color)
    }

    const result = await startUnscramble(context, Duration.seconds(30))
    await context.broadcastMessage(result.message, result.color)
  }
}

const ScrambleWords = [
  // generic
  ...'apple banana grape lemon cherry peach mango kiwi plum table chair couch desk shelf'.split(' '),
  ...'blanket carpet curtain house garden porch fence roof window door floor stairs attic water coffee'.split(' '),
  ...'juice soda milk bread cheese butter egg dog cat bird fish horse rabbit mouse snake frog sun'.split(' '),
  ...'star cloud rain snow wind storm thunder lightning red blue green yellow purple pink brown'.split(' '),
  ...'white happy sad scared brave tired sleepy hungry thirsty excited run walk jump swim'.split(' '),
  ...'sing read write draw car bike bus train plane boat ship truck scooter school teacher student'.split(' '),
  ...'pencil paper eraser ruler map pillow tea moon black dance book lamp turtle climb taxi'.split(' '),

  // hypixel generic
  ...'skyblock bedwars duels skywars murdermystery blitzsg paintball tntgames arcade megawalls'.split(' '),
  ...'buildbattle pit classic arena lobby hub quest daily reward token crown relic dragon phoenix'.split(' '),
  ...'wither ender slime zombie skeleton creeper minion pet armor sword bow axe pickaxe shovel hoe'.split(' '),
  ...'shield potion brew enchant grindstone anvil forge talisman rune scroll gem island farm'.split(' '),
  ...'mine quarry nether overworld end portal warp spawn lobby queue match round team solo duo'.split(' '),
  ...'trio squad clan rank level xp prestige boost upgrade shop market auction trade vote'.split(' '),
  ...'votecrate crate loot chest key mysterybox surprise event festival holiday halloween christmas'.split(' '),
  ...'easter summer winter spring autumn fireworksa'.split(' '),

  // minecraft
  ...''.split('smelting diamond banner netherrack packedice bone zombie'),
  ...'block pickaxe shovel axe hoe sword bow arrow helmet chestplate boots furnace crafting'.split(' '),
  ...'enchanting brewing redstone piston lever button pressureplate torch lantern glowstone obsidian'.split(' '),
  ...'emerald gold iron coal charcoal lapis quartz netherite slimeball feather leather wool carpet'.split(' '),
  ...'map compass bucket water lava sand gravel dirt grass stone cobblestone mossy basalt'.split(' '),
  ...'soulsoil endstone prismarine sea‑lantern kelp coral sponge ice snow cactus vines lilypad oak'.split(' '),
  ...'birch spruce jungle acacia darkoak mangrove bamboo chorus mushroom creeper skeleton spider'.split(' '),
  ...'enderman witch slime ghast blaze shulker villager horse pig cow sheep chicken rabbit dolphin'.split(' '),

  ...'skyblock combat garden jerry farming foraging galatea kills slayer sven hub player skill'.split(' '),
  ...'dungeon healer berserk mage archer tank floor'.split(' ')
]

export async function startUnscramble(
  context: EventContext,
  time: Duration
): Promise<{ message: string; color: Color }> {
  const chosenWord = pickWord()

  const timeout = new Timeout<ChatEvent>(time.toMilliseconds())

  const listener = (event: ChatEvent) => {
    if (event.channelType !== ChannelType.Public) return

    const match = event.message.trim().split(' ')[0].toLowerCase().trim()
    if (match === chosenWord.original) timeout.resolve(event)
  }

  context.application.on('chat', listener)
  await context.broadcastMessage(`Unscramble: ${chosenWord.scrambled}`, Color.Good)
  timeout.refresh()

  const result = await timeout.wait()
  context.application.off('chat', listener)

  // eslint-disable-next-line unicorn/prefer-ternary
  if (result === undefined) {
    return { message: `The answer is: ${chosenWord.original} :(`, color: Color.Info }
  } else {
    return { message: `Good job ${result.user.displayName()}!`, color: Color.Good }
  }
}

function pickWord(): { original: string; scrambled: string } {
  const wordsToPickFrom = ScrambleWords.map((entry) => entry.toLowerCase().trim())
    .filter((entry) => entry.length >= 3)
    .filter((entry) => /^\w+$/.test(entry))

  const pickedWord = wordsToPickFrom[Math.floor(Math.random() * wordsToPickFrom.length)]
  // eslint-disable-next-line unicorn/prefer-spread
  const pickedWordReversed = pickedWord.split('').toReversed().join('')

  for (let tryCount = 0; tryCount < 50; tryCount++) {
    // eslint-disable-next-line unicorn/prefer-spread
    const scrambled = shuffleArrayInPlace(pickedWord.split('')).join('')

    if (scrambled !== pickedWord && scrambled !== pickedWordReversed) {
      return { original: pickedWord, scrambled: scrambled }
    }
  }

  // eslint-disable-next-line unicorn/prefer-spread
  return { original: pickedWord, scrambled: pickedWord.split('').toReversed().join('') }
}
