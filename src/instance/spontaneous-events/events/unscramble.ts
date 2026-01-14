import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color } from '../../../common/application-event'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import { Timeout } from '../../../utility/timeout'
import { shuffleArrayInPlace, SpontaneousEventHandler } from '../common'

export class Unscramble extends SpontaneousEventHandler {
  private static readonly ScrambleWords = [
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

  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Unscramble)
  }

  override async startEvent(): Promise<void> {
    const chosenWord = this.pickWord()

    const timeout = new Timeout<ChatEvent>(30_000)

    const listener = (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return

      const match = event.message.trim().split(' ')[0].toLowerCase().trim()
      if (match === chosenWord.original) timeout.resolve(event)
    }

    this.application.on('chat', listener)
    await this.broadcastMessage(`Unscramble: ${chosenWord.scrambled}`, Color.Good)
    timeout.refresh()

    const result = await timeout.wait()
    this.application.off('chat', listener)

    // eslint-disable-next-line unicorn/prefer-ternary
    if (result === undefined) {
      await this.broadcastMessage(`The answer is: ${chosenWord.original} :(`, Color.Info)
    } else {
      await this.broadcastMessage(`Good job ${result.user.displayName()}!`, Color.Good)
    }
  }

  private pickWord(): { original: string; scrambled: string } {
    const wordsToPickFrom = Unscramble.ScrambleWords.map((entry) => entry.toLowerCase().trim())
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
}
