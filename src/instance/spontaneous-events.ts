import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import type Application from '../application'
import { ChannelType, type ChatEvent, Color, InstanceType, PunishmentPurpose } from '../common/application-event'
import { Instance } from '../common/instance'
import SubInstance from '../common/sub-instance'
import type { User } from '../common/user'
import { SpontaneousEventsNames } from '../core/spontanmous-events-configurations'
import Duration from '../utility/duration'
import { Timeout } from '../utility/timeout'

export class SpontaneousEvents extends Instance<InstanceType.Utility> {
  private readonly registeredEventHandlers: SpontaneousEventHandler[] = []
  private readonly singletonPromise = new PromiseQueue(1)

  private lastEventAt = -1
  private lastEventType: SpontaneousEventHandler | undefined

  private chatHeat: { user: User; timestamp: number }[] = []

  constructor(application: Application) {
    super(application, 'spontaneous-events', InstanceType.Utility)

    this.application.on('chat', async (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return
      await this.singletonPromise.add(() => this.handlePublicChatEvent(event.user, event.createdAt))
    })

    this.registerEvent(new QuickMath(this.application, this, this.eventHelper, this.logger, this.errorHandler))
    this.registerEvent(new CountingChain(this.application, this, this.eventHelper, this.logger, this.errorHandler))
    this.registerEvent(new Unscramble(this.application, this, this.eventHelper, this.logger, this.errorHandler))
    this.registerEvent(new Trivia(this.application, this, this.eventHelper, this.logger, this.errorHandler))
  }

  public registerEvent(handler: SpontaneousEventHandler): void {
    assert.ok(!this.registeredEventHandlers.includes(handler))
    this.registeredEventHandlers.push(handler)
  }

  private async handlePublicChatEvent(user: User, eventCreatedAt: number): Promise<void> {
    const config = this.application.core.spontaneousEventsConfigurations
    const activityDuration = config.getActivityDuration()
    const minimumMessages = config.getMinimumMessages()
    const cooldownDuration = config.getCooldownDuration()
    const minimumUsers = config.getMinimumUsers()

    this.chatHeat.push({ user: user, timestamp: eventCreatedAt })
    this.chatHeat = this.chatHeat.filter(
      (entry) => entry.timestamp + activityDuration.toMilliseconds() > eventCreatedAt
    )

    if (this.chatHeat.length < minimumMessages) return
    if (this.lastEventAt + cooldownDuration.toMilliseconds() > eventCreatedAt) return

    const uniqueUsers: User[] = []
    for (const entry of this.chatHeat) {
      let userExists = false

      for (const countedUser of uniqueUsers) {
        if (countedUser.equalsUser(entry.user)) {
          userExists = true
        }
      }

      if (!userExists) uniqueUsers.push(user)
    }
    if (uniqueUsers.length < minimumUsers) return

    if (!this.application.core.spontaneousEventsConfigurations.getEnabled()) {
      return undefined
    }

    const spontaneousEventHandler = this.pickRandomEvent()
    if (spontaneousEventHandler === undefined) return

    await spontaneousEventHandler.startEvent().finally(() => {
      this.lastEventAt = Date.now()
      this.lastEventType = spontaneousEventHandler
    })
  }

  private pickRandomEvent(): SpontaneousEventHandler | undefined {
    const enabledHandlers = this.registeredEventHandlers.filter((handler) => handler.enabled())
    if (enabledHandlers.length === 0) return undefined

    let preferredHandlers = enabledHandlers.filter((handler) => handler !== this.lastEventType)
    if (preferredHandlers.length === 0) {
      if (enabledHandlers.length > 0) {
        preferredHandlers = enabledHandlers
      } else {
        return undefined
      }
    }

    shuffleArrayInPlace(preferredHandlers)
    return preferredHandlers[Math.floor(Math.random() * preferredHandlers.length)]
  }
}

export abstract class SpontaneousEventHandler extends SubInstance<SpontaneousEvents, InstanceType.Utility, void> {
  override registerEvents() {
    // do nothing
  }

  public abstract enabled(): boolean

  protected async broadcastMessage(message: string, color: Color): Promise<void> {
    await this.application.emit('broadcast', {
      ...this.eventHelper.fillBaseEvent(),

      channels: [ChannelType.Public],
      color: color,

      user: undefined,
      message: message
    })
  }

  abstract startEvent(): Promise<void>
}

class QuickMath extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.QuickMath)
  }

  override async startEvent(): Promise<void> {
    const math = this.createMath()
    if (math === undefined) return

    const timeout = new Timeout<ChatEvent>(10_000)

    const listener = (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return

      const match = /^\d+/g.exec(event.message)
      if (!match) return

      const guess = Number.parseInt(match[0], 10)
      if (guess === math.answer) timeout.resolve(event)
    }

    this.application.on('chat', listener)
    await this.broadcastMessage(`Quick Math: ${math.expression}`, Color.Good)
    timeout.refresh()

    const result = await timeout.wait()
    this.application.off('chat', listener)

    // eslint-disable-next-line unicorn/prefer-ternary
    if (result === undefined) {
      await this.broadcastMessage(`The answer is: ${math.answer} :(`, Color.Info)
    } else {
      await this.broadcastMessage(`Good job ${result.user.displayName()}!`, Color.Good)
    }
  }

  private createMath(): { expression: string; answer: number } | undefined {
    const possibilities = [
      ...Array.from({ length: 5 }).fill('multiplication'),
      ...Array.from({ length: 10 }).fill('addition'),
      ...Array.from({ length: 5 }).fill('trickyAddition'),
      ...Array.from({ length: 5 }).fill('division'),
      ...Array.from({ length: 2 }).fill('hard')
    ] as ('multiplication' | 'addition' | 'trickyAddition' | 'division' | 'hard')[]

    const selected = possibilities[Math.floor(Math.random() * possibilities.length)]
    switch (selected) {
      case 'multiplication': {
        const a = Math.round(Math.random() * 12) + 1
        const b = Math.round(Math.random() * 12) + 1
        return { expression: `${a} * ${b}`, answer: a * b }
      }
      case 'addition': {
        const a = Math.round(Math.random() * 100) + 1
        const b = Math.round(Math.random() * 100) + 1
        return { expression: `${a} + ${b}`, answer: a + b }
      }
      case 'division': {
        for (let tries = 0; tries < 100; tries++) {
          const a = Math.round(Math.random() * 100) + 1
          const b = Math.round(Math.random() * 100) + 1
          if (a % b !== 0) continue
          return { expression: `${a} / ${b}`, answer: a / b }
        }

        return undefined
      }
      case 'trickyAddition': {
        const a = Math.round(Math.random() * 100) + 1
        const b = Math.round(Math.random() * 10) + 1
        const c = Math.round(Math.random() * 10) + 1
        return { expression: `${a} + ${b} * ${c}`, answer: a + b * c }
      }
      case 'hard': {
        const a = Math.round(Math.random() * 5) + 1
        const b = Math.round(Math.random() * 10) + 1
        const c = Math.round(Math.random() * 12) + 1
        const d = Math.round(Math.random() * 4) + 1
        return { expression: `${a} + (${b} * ${c})^${d}`, answer: a + Math.pow(b * c, d) }
      }
    }
  }
}

class CountingChain extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.CountingChain)
  }

  override async startEvent(): Promise<void> {
    const timeout = new Timeout<ChatEvent>(10_000)
    let beforeLast: User | undefined
    let lastUser: User | undefined
    let currentCount = 0

    const listener = async (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return
      const sameAsLastUser = lastUser !== undefined && event.user.equalsUser(lastUser)

      const match = /^[\s!@#$%^&*()_+\-=`~?>|\\\][{}]*(\d+)(?:\s.*|)$/g.exec(event.message)
      if (!match) return

      const nextPossibleCount = Number.parseInt(match[1], 10)
      if (nextPossibleCount === currentCount + 1) {
        if (sameAsLastUser) return

        timeout.refresh()
        currentCount = nextPossibleCount
        beforeLast = lastUser
        lastUser = event.user

        this.logger.debug(`Counting chain reached ${currentCount}`)
        if (/^10+$/g.test(currentCount.toString(10))) {
          await this.broadcastMessage(`Reached ${currentCount.toLocaleString('en-US')} counting chain!`, Color.Good)
          timeout.refresh()
        }
      } else if (nextPossibleCount <= currentCount && lastUser !== undefined) {
        timeout.refresh()
        await this.broadcastMessage(`Last Reached number is ${currentCount} by ${lastUser.displayName()}!`, Color.Info)
        timeout.refresh()
      }
    }

    this.application.on('chat', listener)
    await this.broadcastMessage(`Start counting chain from 1 to infinity!`, Color.Good)
    timeout.refresh()

    await timeout.wait()
    this.application.off('chat', listener)

    if (beforeLast === undefined) {
      await this.broadcastMessage(`Never mind the counting chain :(`, Color.Info)
    } else {
      await this.broadcastMessage(
        `${beforeLast.displayName()} was the 2nd to last to stop counting. How dare you!`,
        Color.Good
      )
      await beforeLast.mute(
        this.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        Duration.minutes(5),
        'Did not continue chain counting'
      )
    }
  }
}

class Unscramble extends SpontaneousEventHandler {
  private static readonly ScrambleWords = [
    // generic
    ...'apple banana orange grape lemon cherry peach mango kiwi plum table chair couch desk shelf'.split(' '),
    ...'blanket carpet curtain house garden porch fence roof window door floor stairs attic water coffee'.split(' '),
    ...'juice soda milk bread cheese butter egg dog cat bird fish horse rabbit mouse snake frog sun'.split(' '),
    ...'star cloud rain snow wind storm thunder lightning red blue green yellow orange purple pink brown'.split(' '),
    ...'white happy sad angry scared brave tired sleepy hungry thirsty excited run walk jump swim'.split(' '),
    ...'sing read write draw car bike bus train plane boat ship truck scooter school teacher student'.split(' '),
    ...'pencil paper eraser ruler clock map pillow tea moon black dance book lamp turtle climb taxi'.split(' '),

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
    ...'block pickaxe shovel axe hoe sword bow arrow helmet chestplate leggings boots furnace crafting'.split(' '),
    ...'enchanting brewing redstone piston lever button pressureplate torch lantern glowstone obsidian'.split(' '),
    ...'emerald gold iron coal charcoal lapis quartz netherite slimeball feather leather wool carpet'.split(' '),
    ...'map compass clock bucket water lava sand gravel dirt grass stone cobblestone mossy basalt'.split(' '),
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

class Trivia extends SpontaneousEventHandler {
  private static readonly IndexLetters = ['a', 'b', 'c', 'd', 'e']
  private static readonly TriviaEntries = [
    {
      question: 'Who painted the Mona Lisa?',
      correctAnswer: 'Michelangelo',
      otherAnswers: ['Michelangelo', 'Raphael', 'Donatello']
    },
    {
      question: 'Who painted The Starry Night?',
      correctAnswer: 'Vincent van Gogh',
      otherAnswers: ['Pablo Picasso', 'Claude Monet', 'Salvador Dalí']
    },
    {
      question: 'Who wrote the poem The Raven?',
      correctAnswer: 'Edgar Allan Poe',
      otherAnswers: ['Robert Frost', 'Walt Whitman', 'T.S. Eliot']
    },
    {
      question: 'What year did the United States declare independence?',
      correctAnswer: '1776',
      otherAnswers: ['1783', '1801', '1754']
    },
    {
      question: 'Which British monarch reigned during the American Revolution?',
      correctAnswer: 'George III',
      otherAnswers: ['Henry VIII', 'Victoria', 'Edward VII']
    },
    {
      question: 'In what year did the Berlin Wall fall?',
      correctAnswer: '1989',
      otherAnswers: ['1979', '1999', '1969']
    },
    {
      question: 'Which treaty formally ended World War I?',
      correctAnswer: 'Treaty of Versailles',
      otherAnswers: ['Treaty of Paris', 'Treaty of Ghent', 'Treaty of Tordesillas']
    },
    {
      question: 'At which battle was Napoleon finally defeated in 1815?',
      correctAnswer: 'Waterloo',
      otherAnswers: ['Trafalgar', ' Austerlitz', ' Borodino']
    },
    {
      question: 'Which is the highest mountain on Earth?',
      correctAnswer: 'Mount Everest',
      otherAnswers: ['K2', 'Kangchenjunga', 'Denali']
    },
    {
      question: 'What is the capital city of Canada?',
      correctAnswer: 'Ottawa',
      otherAnswers: ['Toronto', 'Vancouver', 'Montreal']
    },
    {
      question: 'Which river flows through Paris?',
      correctAnswer: 'Seine',
      otherAnswers: ['Thames', 'Danube', 'Rhine']
    },
    {
      question: 'Which country has the largest population?',
      correctAnswer: 'India',
      otherAnswers: ['China', 'USA', 'Indonesia']
    },
    { question: 'What is the currency of Japan?', correctAnswer: 'Yen', otherAnswers: ['Dollar', 'Euro', 'Peso'] },
    { question: 'What is the chemical symbol for gold?', correctAnswer: 'Au', otherAnswers: ['Ag', 'Go', 'Gd'] },
    {
      question: 'Which planet is famous for its rings?',
      correctAnswer: 'Saturn',
      otherAnswers: ['Jupiter', 'Mars', 'Venus']
    },
    {
      question: 'Photosynthesis primarily occurs in which cell structure?',
      correctAnswer: 'Chloroplast',
      otherAnswers: ['Mitochondrion', 'Nucleus', 'Ribosome']
    },
    {
      question: "Which gas makes up about 78% of Earth's atmosphere?",
      correctAnswer: 'Nitrogen',
      otherAnswers: ['Oxygen', 'Carbon dioxide', 'Argon']
    },
    {
      question: 'What does NASA stand for?',
      correctAnswer: 'National Aeronautics and Space Administration',
      otherAnswers: [
        'North American Space Agency',
        'National Astro Science Association',
        'Nautical Aeronautics & Space Admin'
      ]
    },
    {
      question: 'How many players are on the field for one soccer team?',
      correctAnswer: '11',
      otherAnswers: ['9', '7', '5']
    },
    {
      question: 'How often are the Summer Olympic Games normally held?',
      correctAnswer: 'Every 4 years',
      otherAnswers: ['Every 2 years', 'Every year', 'Every 6 years']
    },
    {
      question: 'Who starred as Jack in the movie Titanic?',
      correctAnswer: 'Leonardo DiCaprio',
      otherAnswers: ['Tom Cruise', 'Brad Pitt', 'Johnny Depp']
    },
    {
      question: 'What award is given for achievement in film?',
      correctAnswer: 'Academy Awards',
      otherAnswers: ['Tonys', 'Emmys', 'Grammys']
    },
    {
      question: 'What does HTTP stand for?',
      correctAnswer: 'HyperText Transfer Protocol',
      otherAnswers: ['HighText Transfer Process', 'Hyperlink Text Transfer Protocol', 'HyperText Transfer Program']
    },
    {
      question: 'Who created JavaScript in 1995?',
      correctAnswer: 'Brendan Eich',
      otherAnswers: ['Tim Berners-Lee', 'Dennis Ritchie', 'Guido van Rossum']
    },
    {
      question: 'What does CPU stand for?',
      correctAnswer: 'Central Processing Unit',
      otherAnswers: ['Computer Program Utility', 'Central Power Unit', 'Control Processing Unit']
    },
    {
      question: 'What does JVM stand for?',
      correctAnswer: 'Java Virtual Machine',
      otherAnswers: ['Java Variable Manager', 'Joint Version Model', 'Java Vendor Module']
    },
    {
      question: 'Which keyword creates a variable in JavaScript?',
      correctAnswer: 'let',
      otherAnswers: ['make', 'define', 'varr']
    },
    {
      question: 'Which tool mines sculk blocks fastest?',
      correctAnswer: 'Hoe',
      otherAnswers: ['Pickaxe', 'Shovel', 'Axe']
    },
    {
      question: 'Which mob is scared of warped fungus?',
      correctAnswer: 'Hoglin',
      otherAnswers: ['Piglin', 'Strider', 'Zoglin']
    },
    {
      question: 'What item is used to respawn the Ender Dragon?',
      correctAnswer: 'End Crystals',
      otherAnswers: ['Eyes of Ender', 'Ghast Tears', 'Obsidian']
    },
    {
      question: 'Which block converts skeletons into strays?',
      correctAnswer: 'Powder Snow',
      otherAnswers: ['Snow Block', 'Ice', 'Packed Ice']
    },
    {
      question: 'Who sculpted the statue of David?',
      correctAnswer: 'Michelangelo',
      otherAnswers: ['Donatello', 'Bernini', 'Rodin']
    },
    {
      question: 'Who painted The Last Supper?',
      correctAnswer: 'Leonardo da Vinci',
      otherAnswers: ['Raphael', 'Titian', 'Botticelli']
    },
    { question: 'What year did World War II end?', correctAnswer: '1945', otherAnswers: ['1939', '1941', '1950'] },
    {
      question: 'Which document began with “We the People”?',
      correctAnswer: 'US Constitution',
      otherAnswers: ['Declaration of Independence', 'Bill of Rights', 'Federalist Papers']
    },
    {
      question: 'Which continent is the Sahara Desert located on?',
      correctAnswer: 'Africa',
      otherAnswers: ['Asia', 'Australia', 'South America']
    },
    {
      question: 'Which country is shaped like a boot?',
      correctAnswer: 'Italy',
      otherAnswers: ['Spain', 'Greece', 'Portugal']
    },
    {
      question: 'What is the capital of Germany?',
      correctAnswer: 'Berlin',
      otherAnswers: ['Munich', 'Frankfurt', 'Hamburg']
    },
    {
      question: 'Which country contains the city of Cairo?',
      correctAnswer: 'Egypt',
      otherAnswers: ['Turkey', 'Israel', 'Jordan']
    },
    {
      question: 'What planet is closest to the Sun?',
      correctAnswer: 'Mercury',
      otherAnswers: ['Venus', 'Earth', 'Mars']
    },
    {
      question: 'Which TV show features the character Walter White?',
      correctAnswer: 'Breaking Bad',
      otherAnswers: ['The Sopranos', "Dexter's Laboratory", 'Mad Men']
    },
    {
      question: 'Which animated movie features a snowman named Olaf?',
      correctAnswer: 'Frozen',
      otherAnswers: ['Tangled', 'Moana', 'Brave']
    },
    {
      question: 'Which actor played Neo in The Matrix?',
      correctAnswer: 'Keanu Reeves',
      otherAnswers: ['Brad Pitt', 'Tom Cruise', 'Johnny Depp']
    },
    {
      question: 'What does RAM stand for?',
      correctAnswer: 'Random Access Memory',
      otherAnswers: ['Read Access Memory', 'Rapid Action Module', 'Runtime Allocation Memory']
    },
    {
      question: 'What does GPU stand for?',
      correctAnswer: 'Graphics Processing Unit',
      otherAnswers: ['General Processing Unit', 'Graphics Power Unit', 'Game Processing Utility']
    },
    {
      question: 'What does URL stand for?',
      correctAnswer: 'Uniform Resource Locator',
      otherAnswers: ['Universal Resource Link', 'Unified Routing Location', 'User Resource List']
    },
    {
      question: 'What does HTML primarily describe on a webpage?',
      correctAnswer: 'Structure',
      otherAnswers: ['Style', 'Behavior', 'Hosting']
    },
    {
      question: 'What does CSS stand for?',
      correctAnswer: 'Cascading Style Sheets',
      otherAnswers: ['Computer Style System', 'Creative Styling Source', 'Code Styling Syntax']
    },
    { question: 'How many skills are there in SkyBlock?', correctAnswer: '13', otherAnswers: ['11', '12', '10'] },
    {
      question: 'What is the base Crit Chance stat in Hypixel SkyBlock?',
      correctAnswer: '30%',
      otherAnswers: ['15%', '20%', '10%']
    },
    {
      question: 'Which NPC sells Farming items in exchange for Jacob’s Tickets and Medals?',
      correctAnswer: 'Anita',
      otherAnswers: ['Banker', 'Jacob', 'Adventurer']
    },
    {
      question: 'Which NPC sells Private Island decorations?',
      correctAnswer: 'Amelia',
      otherAnswers: ['Anita', 'Andrew', 'Banker']
    },
    {
      question: 'By default, how many minions can you place on your SkyBlock island?',
      correctAnswer: '5',
      otherAnswers: ['3', '10', '8']
    },
    { question: 'What Mining level unlocks the Dwarven Mines?', correctAnswer: '12', otherAnswers: ['5', '10', '8'] },
    {
      question: 'What Farming skill level unlocks access to the Mushroom Desert?',
      correctAnswer: '5',
      otherAnswers: ['1', '10', '3']
    },
    {
      question: 'What SkyBlock Level is required to access the Rift Dimension?',
      correctAnswer: '12',
      otherAnswers: ['15', '10', '5']
    },
    {
      question: 'Which NPC trades Candy for rewards during the Spooky Festival?',
      correctAnswer: 'Fear Mongerer',
      otherAnswers: ['Baker', 'Witch', 'Evil Jerry']
    },
    {
      question: 'Which NPC visits with pets to trade during Traveling Zoo events?',
      correctAnswer: 'Oringo',
      otherAnswers: ['Beth', 'Ares', 'Engineer']
    },
    {
      question: 'Which NPC makes the player find various glyphs around the rift?',
      correctAnswer: 'Sorcerer Okron',
      otherAnswers: ['Gunther', 'Sorcerer Zargothrax', 'Tel Kar']
    },
    {
      question: 'Which NPC makes players hack into terminals in the rift?',
      correctAnswer: 'Unhinged Kloon',
      otherAnswers: ['Okron', 'Aidn', 'Cosmo']
    }
  ]

  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Trivia)
  }

  override async startEvent(): Promise<void> {
    const trivia = this.createQuiz()

    const timeout = new Timeout<User>(30_000)
    const incorrectUsers: User[] = []

    const listener = (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return

      const match = /^(\w)(?=\b)[\s!@#$%^&*()_+\-=`~?>|\\\][{}]*$/g.exec(event.message.toLowerCase().trim())
      if (!match) return
      const matchedResult = match[1].toLowerCase()

      if (!Trivia.IndexLetters.includes(matchedResult)) return

      for (const answeredUsers of incorrectUsers) {
        if (answeredUsers.equalsUser(event.user)) return
      }

      if (matchedResult === trivia.answerLetter.toLowerCase()) {
        timeout.resolve(event.user)
      } else {
        incorrectUsers.push(event.user)
      }
    }

    this.application.on('chat', listener)
    await this.broadcastMessage(`Quick Trivia: ${trivia.question}`, Color.Good)
    timeout.refresh()

    const wonUser = await timeout.wait()
    this.application.off('chat', listener)

    // eslint-disable-next-line unicorn/prefer-ternary
    if (wonUser === undefined) {
      await this.broadcastMessage(
        `The answer is: ${trivia.answerDisplay}. Remember you can only answer once and must be with the letter!`,
        Color.Info
      )
    } else {
      await this.broadcastMessage(`Good job ${wonUser.displayName()}!`, Color.Good)
    }
  }

  private createQuiz(): { question: string; answerDisplay: string; answerLetter: string } {
    const trivia = Trivia.TriviaEntries[Math.floor(Math.random() * Trivia.TriviaEntries.length)]

    let question = trivia.question + '\n'

    const answers = [trivia.correctAnswer, ...trivia.otherAnswers]
    shuffleArrayInPlace(answers)

    for (const [index, answer] of answers.entries()) {
      question += `${Trivia.IndexLetters[index].toUpperCase()}. ${answer}\n`
    }

    return {
      question: question.trim(),
      answerDisplay: trivia.correctAnswer,
      answerLetter: Trivia.IndexLetters[answers.indexOf(trivia.correctAnswer)]
    }
  }
}

// https://stackoverflow.com/a/2450976
function shuffleArrayInPlace<T>(array: T[]): T[] {
  let currentIndex = array.length

  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}
