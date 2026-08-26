import type { ChatEvent } from '../../../common/application-event.js'
import { ChannelType, Color } from '../../../common/application-event.js'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations.js'
import type Duration from '../../../utility/duration.js'
import { Timeout } from '../../../utility/timeout.js'
import { type EventContext, type EventResult, shuffleArrayInPlace, SpontaneousEventHandler } from '../common.js'

export class Unscramble extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Unscramble)
  }

  override async startEvent(): Promise<EventResult> {
    const context: EventContext = {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      broadcastMessage: (message, color) => this.broadcastMessage(message, color)
    }

    const duration = this.application.core.spontaneousEventsConfigurations.getUnscrambleDuration()
    const result = await startUnscramble(context, duration)
    await context.broadcastMessage(result.message, result.color)

    return result.eventResult
  }
}

// prettier-ignore
// eslint-disable-next-line @typescript-eslint/naming-convention
const scrambleEntries: ScrambleEntry[] = [
  {
    unscramble: ['Apple', 'Banana', 'Lemon', 'Peach', 'Mango', 'Kiwi', 'Plum', 'Cherry'],
    hint: 'Fruit'
  },
  {
    unscramble: ['Grape', 'Strawberry', 'Blueberry', 'Raspberry', 'Blackberry', 'Cranberry', 'Gooseberry', 'Mulberry', 'Boysenberry'],
    hint: 'Berry'
  },
  {
    unscramble: ['Chair', 'Couch', 'Desk', 'Shelf', 'Table'],
    hint: 'Furniture'
  },
  {
    unscramble: ['Blanket', 'Curtain', 'Lamp', 'Mirror', 'Pillow'],
    hint: 'Household items'
  },
  {
    unscramble: ['Window', 'Door', 'Floor', 'Roof', 'Stairs', 'Attic'],
    hint: 'Building feature'
  },
  {
    unscramble: ['Kitchen', 'Bedroom', 'Hallway', 'Garage', 'Balcony', 'Basement', 'Closet', 'Bathroom'],
    hint: 'Household room or area'
  },
  {
    unscramble: [
      'Park', 'Forest', 'Beach', 'Field', 'Meadow', 'Jungle', 'Desert', 'Mountain', 'Hill', 'Valley', 'Lake', 'River', 'Island', 'Campground',
      'Playground', 'Yard', 'Backyard', 'Orchard', 'Ranch', 'Trail', 'Campsite', 'Garden'
    ],
    hint: 'Outdoor area'
  },
  {
    unscramble: [
      'Water', 'Coffee', 'Juice', 'Soda', 'Milk', 'Tea', 'Beer', 'Wine', 'Lemonade', 'Hot Chocolate', 'Smoothie', 'Milkshake', 'Energy Drink',
      'Cider', 'Latte', 'Espresso', 'Cappuccino', 'Mocha', 'Bubble Tea', 'Kombucha'
    ],
    hint: 'Beverage'
  },
  {
    unscramble: [
      'Box', 'Bag', 'Jar', 'Cup', 'Bowl', 'Bucket', 'Bin', 'Can', 'Crate', 'Carton', 'Bottle', 'Basket', 'Pouch', 'Case', 'Barrel', 'Tote',
      'Envelope', 'Packet', 'Purse', 'Backpack'
    ],
    hint: 'Container'
  },
  {
    unscramble: [
      'Baguette', 'Blue Cheese', 'Butter', 'Egg', 'Honey', 'Burger', 'Pizza', 'Spaghetti', 'Cookie', 'Donut', 'Muffin', 'Sandwich', 'Lasagna',
      'Schnitzel', 'French Fries', 'Maple Syrup'
    ],
    hint: 'Food'
  },
  {
    unscramble: [
      'Dog', 'Cat', 'Bird', 'Horse', 'Rabbit', 'Mouse', 'Snake', 'Fox', 'Wolf', 'Deer', 'Falcon', 'Eagle', 'Hawk', 'Pig', 'Cow', 'Sheep',
      'Chicken', 'Parrot', 'Owl', 'Polar Bear'
    ],
    hint: 'Land animal'
  },
  {
    unscramble: [
      'Fish', 'Frog', 'Turtle', 'Goblin Shark', 'Bull Shark', 'Blue Marlin', 'Otter', 'Seal', 'Whale', 'Dolphin', 'Orca', 'Stingray', 'Lanternfish',
      'Anglerfish'
    ],
    hint: 'Aquatic animal'
  },
  {
    unscramble: ['Sun', 'Moon', 'Star', 'Earth', 'Meteor', 'Comet', 'Planet', 'Galaxy', 'Rocket', 'Satellite'],
    hint: 'Outer space'
  },
  {
    unscramble: ['Cloud', 'Rain', 'Snow', 'Wind', 'Storm', 'Thunder', 'Lightning', 'Fog', 'Mist', 'Rainbow', 'Tornado'],
    hint: 'Weather'
  },
  {
    unscramble: [
      'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Brown', 'White', 'Black', 'Violet', 'Magenta', 'Orange', 'Gold', 'Lime', 'Gray',
      'Teal', 'Aqua'
    ],
    hint: 'Color'
  },
  {
    unscramble: ['Happy', 'Sad', 'Scared', 'Brave', 'Tired', 'Sleepy', 'Hungry', 'Thirsty', 'Excited'],
    hint: 'Emotion, mood, or feeling'
  },
  {
    unscramble: ['Run', 'Walk', 'Jump', 'Swim', 'Dance', 'Climb'],
    hint: 'Movement action'
  },
  {
    unscramble: ['Read', 'Write', 'Draw', 'Paint'],
    hint: 'Learning or creative activity'
  },
  {
    unscramble: ['Car', 'Bike', 'Bus', 'Train', 'Plane', 'Boat', 'Ship', 'Truck', 'Scooter', 'Taxi'],
    hint: 'Transportation'
  },
  {
    unscramble: ['School', 'Teacher', 'Student', 'Pencil', 'Paper', 'Eraser', 'Ruler', 'Textbook'],
    hint: 'Education'
  },
  {
    unscramble: [
      'SkyBlock', 'Bed Wars', 'Duels', 'SkyWars', 'Murder Mystery', 'Blitz SG', 'Paintball', 'TNT Games', 'Arcade', 'Mega Walls',
      'Build Battle', 'Pit', 'Classic', 'Lobby', 'Hub'
    ],
    hint: 'Minigame'
  },
  {
    unscramble: [
      'Wither', 'Enderman', 'Slime', 'Zombie', 'Skeleton', 'Creeper', 'Spider', 'Witch', 'Ghast', 'Blaze', 'Shulker', 'Villager', 'Breeze', 'Bogged'
    ],
    hint: 'Minecraft mob'
  },
  {
    unscramble: ['Armor', 'Sword', 'Bow', 'Axe', 'Pickaxe', 'Shovel', 'Hoe', 'Shield'],
    hint: 'Equipment or tool'
  },
  {
    unscramble: ['Overworld', 'Nether', 'End'],
    hint: 'Minecraft dimension'
  },
  {
    unscramble: ['Queue', 'Match', 'Round', 'Team', 'Solo', 'Duo', 'Trio', 'Squad'],
    hint: 'Matchmaking term'
  },
  {
    unscramble: [
      'Chest', 'Block', 'Arrow', 'Helmet', 'Chestplate', 'Boots', 'Furnace', 'Crafting Table', 'Enchanting Table', 'Brewing Stand', 'Redstone',
      'Piston', 'Lever', 'Button', 'Pressure Plate', 'Torch', 'Sea Lantern', 'Glowstone', 'Obsidian', 'Emerald', 'Gold', 'Iron', 'Coal', 'Charcoal',
      'Lapis', 'Quartz', 'Netherite', 'Slimeball', 'Feather', 'Leather', 'Wool', 'Compass', 'Bucket', 'Lava', 'Sand', 'Gravel', 'Dirt', 'Grass',
      'Stone', 'Cobblestone', 'Moss Block', 'Basalt', 'Soulsoil', 'End Stone', 'Prismarine Shard', 'Kelp', 'Coral', 'Sponge', 'Ice', 'Cactus', 'Vines',
      'Lilypad', 'Oak Log', 'Birch Log', 'Spruce Log', 'Jungle Log', 'Acacia Log', 'Dark Oak Log', 'Mangrove Log', 'Bamboo', 'Chorus Fruit', 'Mushroom',
      'Crafter', 'Mace', 'Heavy Core', 'Wind Charge', 'Breeze Rod', 'Trial Key', 'Ominous Trial Key', 'Ominous Bottle', 'Trial Spawner', 'Ominous Trial Spawner',
      'Vault', 'Ominous Vault', 'Golden Apple', 'Enchanted Golden Apple', 'Ender Pearl', 'Eye of Ender', 'Totem of Undying', 'Elytra', 'Trident', 'Crossbow',
      'Spyglass', 'Brush', 'Turtle Helmet', 'Recovery Compass', 'Goat Horn', 'Name Tag', 'Saddle', 'Lead', 'Book and Quill', 'Dragon Egg', 'Echo Shard',
      'Chorus Flower', 'Chorus Plant', 'Moss Carpet', 'Packed Ice', 'Blue Ice', 'Netherrack', 'Soul Sand', 'Bone Block', 'Hay Bale', 'Target', 'Campfire',
      'Soul Campfire', 'Respawn Anchor', 'Nether Star', 'Beacon', 'Conduit', 'Heart of the Sea', 'Prismarine Crystals', 'Amethyst Shard', 'Calcite', 'Tuff',
      'Dripstone Block', 'Pointed Dripstone', 'Deepslate', 'Reinforced Deepslate', 'Frogspawn', 'Tadpole Bucket', 'Sniffer Egg', 'Pitcher Plant', 'Torchflower',
      'Decorated Pot', 'Armadillo Scute', 'Anvil', 'Grindstone'
    ],
    hint: 'Minecraft block or item'
  },
  {
    unscramble: ['Holiday', 'Halloween', 'Christmas', 'Easter', 'Summer', 'Winter', 'Spring', 'Autumn'],
    hint: 'Time of year'
  },
  {
    unscramble: ['Fireworks', 'Event', 'Festival'],
    hint: 'Special occasion'
  },
  {
    unscramble: [
      'Healer', 'Berserk', 'Mage', 'Archer', 'Tank', 'Combat', 'Farming', 'Fishing', 'Mining', 'Foraging', 'Enchanting',
      'Alchemy', 'Carpentry', 'Taming', 'Hunting', 'Catacombs', 'Runecrafting', 'Social'
    ],
    hint: 'SkyBlock skill or dungeon class'
  },
  {
    unscramble: [
      'Jerry', 'Aatrox', 'Combat Merchant', 'Alchemist', 'Alixer', 'Amelia', 'Anita', 'Andrew', 'Apprentice', 'Arthur', 'Auction Master',
      'Auction Agent', 'Baker', 'Banker', 'Bartender', 'Bazaar', 'Bazaar Agent', 'Bea', 'Biblio', 'Billy Joe', 'Blacksmith', 'Bobby Joe',
      'Builder', 'Carnival Cowboy', 'Carnival Fisherman', 'Carnival Leader', 'Carnival Pirateman', 'Carpenter', 'Chantelle', 'Christopher',
      'Clerk Seraphine', 'Coach Jackrabbit', 'Cole', 'Curator', 'Damia', 'Derpy', 'Diana', 'Diaz', 'Doug', 'Duke', 'Dusk', 'Elizabeth',
      'Erihann', 'Fann', 'Farm Merchant', 'Farmer', 'Fear Mongerer', 'Felix', 'Finnegan', 'Fishing Merchant', 'Fisherman Gerald', 'Foxy',
      'George', 'Gladiator', 'Guy', 'Hoppity', 'Jack', 'Jacob', 'Jacobus', 'Jamie', 'Jax', 'Jim Bob', 'Liam', 'Librarian', 'Lonely Philosopher',
      'Lucius', 'Lumber Jack', 'Lumber Merchant', 'Mad Redstone Engineer', 'Maddox the Slayer', 'Marina', 'Maths Enjoyer', 'Mine Merchant',
      'Oringo', 'Ozanne', 'Ophelia', 'Security Sloth', 'Salesman', 'Seymour', 'Tyashoi Alchemist', 'Wool Weaver', 'Udium', 'Romero',
      'Old Shaman Nyko'
    ],
    hint: 'SkyBlock NPC'
  },
  {
    unscramble: [
      'Sea Walker', 'Squid', 'Inkling', "Jumpin' Jack", 'Sea Witch', 'Sea Archer', 'Rider of the Deep', 'Catfish', 'Carrot King',
      'Agarimoo', 'Sea Leech', 'Guardian Defender', 'Deep Sea Protector', 'Water Hydra', 'The Loch Emperor', 'Frog Man', 'Snapping Turtle',
      'Wiki Tiki', 'Oasis Rabbit', 'Oasis Sheep', 'Water Worm', 'Poisoned Water Worm', 'Abyssal Miner', 'Mithril Grubber', 'Dumpster Diver',
      'Trash Gobbler', 'Bayou Sludge', 'Alligator', 'Titanoboa', 'Scarecrow', 'Nightmare', 'Werewolf', 'Phantom Fisher', 'Grim Reaper',
      'Frozen Steve', 'Frosty', 'Grinch', 'Yeti', 'Nutcracker', 'Reindrake', 'Nurse Shark', 'Blue Shark', 'Tiger Shark', 'Great White Shark',
      'Magma Slug', 'Moogma', 'Lava Leech', 'Pyroclastic', 'Lava Flame', 'Fire Eel', 'Taurus', 'Plhlegblast', 'Thunder', 'Lord Jawbus', 'Fried Chicken',
      'Fireproof Witch', 'Fiery Scuttler', 'Ragnarok', 'Flaming Worm', 'Lava Blaze', 'Lava Pigman', 'Manta Ray', 'Volcanic Snail', 'Magma Pillar',
      'Haggard', 'Brineling', 'Sprawl', 'Torrid', 'Silkbreeze', 'Giant Isopod'
    ],
    hint: 'SkyBlock sea creature'
  },
  {
    unscramble: [
      'Bezal', 'Flare', 'Smoldering Blaze', 'Dive Ghast', 'Hellwisp', 'Mushroom Bull', 'Flaming Spider', 'Kada Knight', 'Vanquisher', 'Ashfang',
      'The Matriarch', 'Bladesoul', 'Mage Outlaw', 'Matcho', 'Wither Spectre', 'Wai', 'Zee'
    ],
    hint: 'Crimson Isle mob'
  },
  {
    unscramble: [
      'Cavernfish', 'Flitter', 'Shyworm', 'Driftling', 'Chuckwalla', 'Rockmite', 'Scrappy', 'Snoozle', 'Gemzie', 'Foxtrot', 'Bluebird', 'Honeybug',
      'Treefrog', 'Woodchucker', 'Fluffling', 'Hideonfloor', 'Parakeet', 'Macaw', 'Areita', 'Bloodbat', 'Duplico', 'Gazer', 'Litterbug', 'Gimmiegold',
      'Hideonwall', 'Hideyho', 'Doomspiral', 'Strongarm', 'Tepid', 'Polaris', 'Shuddersquid', 'Billygoat', 'Mantis Shrimp', 'Nozzlenose', 'Troodon',
      'Wumpa'
    ],
    hint: 'Critter Safari critter'
  },
  {
    unscramble: [
      'Smartphone', 'Laptop', 'Computer', 'Television', 'Headphones', 'Earbuds', 'Keyboard', 'Tablet', 'Calculator', 'Camera', 'Microphone', 'Speaker',
      'Projector', 'Printer', 'Controller', 'Modem', 'Router', 'Drone', 'Walkie Talkie', 'Smartwatch'
    ],
    hint: 'Electronic device'
  },
  {
    unscramble: [
      'Italy', 'United States', 'Mexico', 'United Kingdom', 'Canada', 'Japan', 'Germany', 'France', 'Spain', 'Costa Rica', 'Thailand', 'China', 'India',
      'Russia', 'Brazil', 'Switzerland', 'Australia', 'Greece', 'Portugal', 'South Korea'
    ],
    hint: 'Country'
  },
  {
    unscramble: [
      'Private Island', 'The Barn', 'Mushroom Desert', 'The Park', 'The End', 'Crimson Isle', 'Gold Mine', 'Deep Caverns', 'Dwarven Mines',
      'Crystal Hollows', 'Dungeon Hub', 'Rift Dimension', 'Backwater Bayou', 'Moonglade Marsh', 'Torrhus Canyon', 'Critter Safari'
    ],
    hint: 'SkyBlock island or area'
  },
  {
    unscramble: [
      'French Bread', 'Pioneer Pickaxe', 'Campaign Poster', 'Moldy Muffin', 'Creative Mind', 'Quality Map', 'Dead Bush Of Love', 'Wiki Journal',
      "Editor's Pencil", 'Game Breaker', 'Game Annihilator', 'Ancient Elevator', 'Kloonboat', 'Space Helmet', 'Shiny Relic', 'Piece Of Wizard Portal',
      'Expensive Toy', 'Golden Collar', 'Locked Ballot Box', 'There And Back Again', 'Dreamspire Torch', 'Spooky Pie', 'New Year Cake', 'Golden Gift',
      'Bingo Card', 'Kuudra Follower Helmet', 'Kuudra Follower Chestplate', 'Kuudra Follower Leggings', 'Kuudra Follower Boots', 'Kuudra Relic', 'Wet Napkin',
      'Kuudra Teeth Plaque', 'Supreme Timecharm', 'Chicken N Egg Timecharm', 'mrahcemiT esrevrorriM', 'SkyBlock Citizen Timecharm', 'Living Timecharm',
      'Globulate Timecharm', 'Vampiric Timecharm', 'Celestial Timecharm', 'Colossal Experience Bottle Upgrade', 'Heat Core', 'God Potion', 'Kat Flower'
    ],
    hint: 'Special SkyBlock item'
  },
  {
    unscramble: [
      'Simple Carrot Candy', 'Great Carrot Candy', 'Superb Carrot Candy', 'Ultimate Carrot Candy', 'Pet Cake', 'Chyme', 'Fish Food', 'Crude Gabagool',
      'Fuel Gabagool', 'Very Crude Gabagool', 'Heavy Gabagool', 'Hypergolic Gabagool'
    ],
    hint: 'SkyBlock pet candy'
  },
  {
    unscramble: ['Goryo', 'Obake', 'Onryo', 'Raiju', 'Shiryo', 'Yurei', 'Aswang', 'Banshee', 'Myling', 'Shade', 'Poltergeist', 'Kormos'],
    hint: 'Ghost'
  },
  {
    unscramble: ['Village', 'Castle', 'Kingdom', 'Tower', 'Dungeon', 'Fortress', 'Temple', 'Ruins', 'Palace'],
    hint: 'Fantasy place'
  },
  {
    // Scrambles that don't fit into other categories
    unscramble: [
      'Quest', 'Daily', 'Reward', 'Token', 'Crown', 'Relic', 'Phoenix', 'Minion', 'Potion', 'Brew', 'Enchant', 'Forge', 'Talisman',
      'Rune', 'Scroll', 'Quarry', 'Portal', 'Warp', 'Level', 'Prestige', 'Boost', 'Upgrade', 'Shop', 'Market', 'Auction', 'Trade',
      'Vote Crate', 'Loot', 'Key', 'Mystery Box', 'Surprise', 'Clan'
    ]
  }
]

export async function startUnscramble(
  context: EventContext,
  time: Duration
): Promise<{ message: string; color: Color; eventResult: EventResult }> {
  const chosenWord = pickWord()

  const timeout = new Timeout<ChatEvent>(time.toMilliseconds())

  const listener = (event: ChatEvent) => {
    if (event.channelType !== ChannelType.Public) return

    const match = event.message.trim()
    if (match.toLowerCase() === chosenWord.original.toLowerCase()) timeout.resolve(event)
  }

  context.application.on('chat', listener)
  timeout.refresh()
  let response = `Unscramble: ${chosenWord.scrambled}`
  if (chosenWord.hint !== undefined) response += ` - Hint: ${chosenWord.hint}`
  await context.broadcastMessage(response, Color.Good)

  const result = await timeout.wait()
  context.application.off('chat', listener)

  // eslint-disable-next-line unicorn/prefer-ternary
  if (result === undefined) {
    return { message: `The answer is: ${chosenWord.original} :(`, color: Color.Info, eventResult: { type: 'ended' } }
  } else {
    return {
      message: `Good job ${result.user.displayName()}!`,
      color: Color.Good,
      eventResult: { type: 'win', user: result.user }
    }
  }
}

function pickWord(): { original: string; scrambled: string; hint?: string } {
  const entry = scrambleEntries[Math.floor(Math.random() * scrambleEntries.length)]
  const pickedWord = entry.unscramble[Math.floor(Math.random() * entry.unscramble.length)]
  const hint = entry.hint

  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  const characters = [...pickedWord]
  const letters = characters.filter((character) => character !== ' ')
  const pickedWordReversed = letters.toReversed().join('')

  for (let tryCount = 0; tryCount < 50; tryCount++) {
    const scrambledLetters = shuffleArrayInPlace([...letters])
    const scrambled = applyLettersToPattern(characters, scrambledLetters)

    if (scrambled !== pickedWord && scrambled.replaceAll(' ', '') !== pickedWordReversed) {
      return { original: pickedWord, scrambled: scrambled, hint }
    }
  }

  return {
    original: pickedWord,
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    scrambled: applyLettersToPattern(characters, [...pickedWordReversed]),
    hint
  }
}

function applyLettersToPattern(pattern: string[], letters: string[]): string {
  let letterIndex = 0
  return pattern.map((character) => (character === ' ' ? ' ' : letters[letterIndex++])).join('')
}

interface ScrambleEntry {
  unscramble: string[]
  hint?: string
}
