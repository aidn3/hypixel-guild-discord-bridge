import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color } from '../../../common/application-event'
import type { User } from '../../../common/user'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import type Duration from '../../../utility/duration'
import { Timeout } from '../../../utility/timeout'
import { type EventContext, shuffleArrayInPlace, SpontaneousEventHandler } from '../common'

export class Trivia extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Trivia)
  }

  override async startEvent(): Promise<void> {
    const context: EventContext = {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      broadcastMessage: (message, color) => this.broadcastMessage(message, color)
    }

    const duration = this.application.core.spontaneousEventsConfigurations.getTriviaDuration()
    const result = await startTrivia(context, duration)
    await context.broadcastMessage(result.message, result.color)
  }
}

const IndexLetters = ['a', 'b', 'c', 'd', 'e']
const TriviaEntries = [
  {
    question: 'Who painted the Mona Lisa?',
    correctAnswer: 'Leonardo',
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
  {
    question: 'What is the currency of Japan?',
    correctAnswer: 'Yen',
    otherAnswers: ['Dollar', 'Euro', 'Peso']
  },
  {
    question: 'What is the chemical symbol for gold?',
    correctAnswer: 'Au',
    otherAnswers: ['Ag', 'Go', 'Gd']
  },
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
  {
    question: 'What year did World War II end?',
    correctAnswer: '1945',
    otherAnswers: ['1939', '1941', '1950']
  },
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
  {
    question: 'How many skills are there in SkyBlock?',
    correctAnswer: '13',
    otherAnswers: ['11', '12', '10']
  },
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
  {
    question: 'What Mining level unlocks the Dwarven Mines?',
    correctAnswer: '12',
    otherAnswers: ['5', '10', '8']
  },
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
  },
  {
    question: 'What is the chemical symbol for silver?',
    correctAnswer: 'Ag',
    otherAnswers: ['Au', 'Al', 'Si', 'Sn']
  },
  {
    question: 'What is the chemical symbol for iron?',
    correctAnswer: 'Fe',
    otherAnswers: ['Ir', 'In', 'Fr', 'I']
  },
  {
    question: 'What is the chemical symbol for sodium?',
    correctAnswer: 'Na',
    otherAnswers: ['Ne', 'N', 'Nd', 'Ni']
  },
  {
    question: 'What is the chemical symbol for potassium?',
    correctAnswer: 'K',
    otherAnswers: ['Kr', 'P', 'Ca', 'Pt']
  },
  {
    question: 'What is the chemical symbol for copper?',
    correctAnswer: 'Cu',
    otherAnswers: ['Co', 'Cr', 'Cm', 'C']
  },
  {
    question: 'What is the chemical symbol for lead?',
    correctAnswer: 'Pb',
    otherAnswers: ['Pd', 'Pt', 'Fe', 'Li']
  },
  {
    question: 'What is the chemical symbol for chlorine?',
    correctAnswer: 'Cl',
    otherAnswers: ['Ca', 'Cr', 'C', 'Co']
  },
  {
    question: 'What is the chemical symbol for magnesium?',
    correctAnswer: 'Mg',
    otherAnswers: ['Mn', 'Mo', 'Hg', 'Ag']
  },
  {
    question: 'Which element has the symbol Hg?',
    correctAnswer: 'Mercury',
    otherAnswers: ['Helium', 'Magnesium', 'Silver', 'Hydrogen']
  },
  {
    question: 'Which element has the symbol Sn?',
    correctAnswer: 'Tin',
    otherAnswers: ['Sulfur', 'Sodium', 'Zinc', 'Silver']
  },
  {
    question: 'Which element has the symbol W?',
    correctAnswer: 'Tungsten',
    otherAnswers: ['Tin', 'Zinc', 'Gold', 'Uranium']
  },
  {
    question: 'What is the largest planet in the Solar System?',
    correctAnswer: 'Jupiter',
    otherAnswers: ['Saturn', 'Neptune', 'Earth', 'Mars']
  },
  {
    question: 'What galaxy is Earth located in?',
    correctAnswer: 'Milky Way',
    otherAnswers: ['Andromeda', 'Triangulum', 'Whirlpool', 'Sombrero']
  },
  {
    question: 'What is the closest star to Earth?',
    correctAnswer: 'Sun',
    otherAnswers: ['Proxima Centauri', 'Sirius', 'Polaris', 'Alpha Centauri A']
  },
  {
    question: 'Which planet is known as the Red Planet?',
    correctAnswer: 'Mars',
    otherAnswers: ['Venus', 'Mercury', 'Jupiter', 'Saturn']
  },
  {
    question: 'Which planet has the Great Red Spot?',
    correctAnswer: 'Jupiter',
    otherAnswers: ['Saturn', 'Mars', 'Neptune', 'Uranus']
  },
  {
    question: 'What do you call a space rock that lands on Earth?',
    correctAnswer: 'Meteorite',
    otherAnswers: ['Asteroid', 'Comet', 'Nebula', 'Satellite']
  },
  {
    question: 'What was the first artificial satellite launched into space?',
    correctAnswer: 'Sputnik 1',
    otherAnswers: ['Apollo 11', 'Explorer 1', 'Voyager 1', 'Luna 2']
  },
  {
    question: 'What force keeps planets in orbit around the Sun?',
    correctAnswer: 'Gravity',
    otherAnswers: ['Magnetism', 'Friction', 'Radiation', 'Pressure']
  },
  {
    question: 'Which dwarf planet was once considered the ninth planet?',
    correctAnswer: 'Pluto',
    otherAnswers: ['Ceres', 'Eris', 'Haumea', 'Makemake']
  },
  {
    question: 'What is the Sun mostly made of?',
    correctAnswer: 'Hydrogen',
    otherAnswers: ['Helium', 'Oxygen', 'Carbon', 'Iron']
  },
  {
    question: 'What is a group of stars forming a recognized pattern called?',
    correctAnswer: 'Constellation',
    otherAnswers: ['Galaxy', 'Nebula', 'Orbit', 'Eclipse']
  },
  {
    question: 'What is the largest mammal on Earth?',
    correctAnswer: 'Blue whale',
    otherAnswers: ['African elephant', 'Orca', 'Giraffe', 'Hippopotamus']
  },
  {
    question: 'What is the hardest natural substance?',
    correctAnswer: 'Diamond',
    otherAnswers: ['Quartz', 'Iron', 'Obsidian', 'Granite']
  },
  {
    question: 'What is the largest organ in the human body?',
    correctAnswer: 'Skin',
    otherAnswers: ['Heart', 'Liver', 'Lungs', 'Brain']
  },
  {
    question: 'Which part of the body contains the smallest bones?',
    correctAnswer: 'Ear',
    otherAnswers: ['Hand', 'Foot', 'Spine', 'Skull']
  },
  {
    question: 'What is the largest ocean on Earth?',
    correctAnswer: 'Pacific Ocean',
    otherAnswers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean']
  },
  {
    question: 'Which animal is the only mammal capable of true flight?',
    correctAnswer: 'Bat',
    otherAnswers: ['Flying squirrel', 'Sugar glider', 'Penguin', 'Ostrich']
  },
  {
    question: 'Which sea creature has three hearts?',
    correctAnswer: 'Octopus',
    otherAnswers: ['Crab', 'Seahorse', 'Dolphin', 'Starfish']
  },
  {
    question: 'What is the largest species of shark?',
    correctAnswer: 'Whale shark',
    otherAnswers: ['Great white', 'Hammerhead', 'Tiger shark']
  },
  {
    question: 'What do bees collect from flowers to make honey?',
    correctAnswer: 'Nectar',
    otherAnswers: ['Pollen', 'Sap', 'Dew', 'Seeds']
  },
  {
    question: 'What is the process called when a caterpillar becomes a butterfly?',
    correctAnswer: 'Metamorphosis',
    otherAnswers: ['Migration', 'Pollination', 'Hibernation']
  },
  {
    question: 'How many chambers does a human heart have?',
    correctAnswer: '4',
    otherAnswers: ['2', '3', '5', '6']
  },
  {
    question: 'The femur is a bone in which part of the body?',
    correctAnswer: 'Thigh',
    otherAnswers: ['Forearm', 'Skull', 'Chest', 'Neck']
  },
  {
    question: 'Which organ produces insulin?',
    correctAnswer: 'Pancreas',
    otherAnswers: ['Liver', 'Kidney', 'Spleen', 'Gallbladder']
  },
  {
    question: 'Which part of a plant absorbs most water from the soil?',
    correctAnswer: 'Roots',
    otherAnswers: ['Leaves', 'Stem', 'Petals', 'Seeds']
  },
  {
    question: 'Which gas do plants absorb from the atmosphere for photosynthesis?',
    correctAnswer: 'Carbon dioxide',
    otherAnswers: ['Oxygen', 'Nitrogen', 'Hydrogen']
  },
  {
    question: "What is molten rock below Earth's surface called?",
    correctAnswer: 'Magma',
    otherAnswers: ['Lava', 'Ash', 'Quartz', 'Basalt']
  },
  {
    question: 'Which instrument records earthquake activity?',
    correctAnswer: 'Seismograph',
    otherAnswers: ['Barometer', 'Thermometer', 'Altimeter', 'Anemometer']
  },
  {
    question: 'What is the largest desert in the world?',
    correctAnswer: 'Antarctica',
    otherAnswers: ['Sahara', 'Gobi', 'Arabian', 'Kalahari']
  },
  {
    question: 'What is the study of weather called?',
    correctAnswer: 'Meteorology',
    otherAnswers: ['Geology', 'Astronomy', 'Ecology', 'Seismology']
  },
  {
    question: 'How many squares are on a chessboard?',
    correctAnswer: '64',
    otherAnswers: ['49', '56', '72', '81']
  },
  {
    question: 'Which chess piece moves in an L shape?',
    correctAnswer: 'Knight',
    otherAnswers: ['Bishop', 'Rook', 'Pawn', 'Queen']
  },
  {
    question: 'What ingredient makes bread rise?',
    correctAnswer: 'Yeast',
    otherAnswers: ['Salt', 'Sugar', 'Butter', 'Vinegar']
  },
  {
    question: 'What is a word with the opposite meaning of another word called?',
    correctAnswer: 'Antonym',
    otherAnswers: ['Synonym', 'Acronym', 'Homonym', 'Palindrome']
  },
  {
    question: 'What do you call a word spelled the same forward and backward?',
    correctAnswer: 'Palindrome',
    otherAnswers: ['Anagram', 'Homophone', 'Acronym', 'Antonym']
  },
  {
    question: 'Which family of instruments does a trumpet belong to?',
    correctAnswer: 'Brass',
    otherAnswers: ['Strings', 'Woodwind', 'Percussion', 'Keyboard']
  },
  {
    question: 'Which detective lives at 221B Baker Street?',
    correctAnswer: 'Sherlock Holmes',
    otherAnswers: ['Hercule Poirot', 'Nancy Drew', 'Miss Marple']
  },
  {
    question: 'What is the capital of Australia?',
    correctAnswer: 'Canberra',
    otherAnswers: ['Sydney', 'Melbourne', 'Perth', 'Brisbane']
  },
  {
    question: 'What is the capital of Argentina?',
    correctAnswer: 'Buenos Aires',
    otherAnswers: ['Santiago', 'Lima', 'Montevideo', 'Bogota']
  },
  {
    question: "What is South America's longest river?",
    correctAnswer: 'Amazon',
    otherAnswers: ['Parana', 'Orinoco', 'Nile']
  },
  {
    question: 'Which is the smallest continent?',
    correctAnswer: 'Australia',
    otherAnswers: ['Europe', 'Antarctica', 'South America', 'Africa']
  },
  {
    question: 'Which country is home to Istanbul?',
    correctAnswer: 'Turkey',
    otherAnswers: ['Greece', 'Egypt', 'Bulgaria', 'Romania']
  },
  {
    question: 'What line divides Earth into north and south hemispheres?',
    correctAnswer: 'Equator',
    otherAnswers: ['Prime Meridian', 'Tropic of Cancer', 'Arctic Circle']
  },
  {
    question: 'What is the largest island in the world?',
    correctAnswer: 'Greenland',
    otherAnswers: ['Madagascar', 'Borneo', 'New Guinea', 'Iceland']
  },
  {
    question: 'Which sea lies between Europe and Africa?',
    correctAnswer: 'Mediterranean Sea',
    otherAnswers: ['Black Sea', 'Red Sea', 'Baltic Sea']
  },
  {
    question: 'What is the capital of South Korea?',
    correctAnswer: 'Seoul',
    otherAnswers: ['Busan', 'Tokyo', 'Bangkok', 'Beijing']
  },
  {
    question: 'Which mountain range forms a natural border between France and Spain?',
    correctAnswer: 'Pyrenees',
    otherAnswers: ['Alps', 'Apennines', 'Andes']
  },
  {
    question: 'Which bird is capable of flying backward?',
    correctAnswer: 'Hummingbird',
    otherAnswers: ['Sparrow', 'Eagle', 'Penguin', 'Falcon']
  },
  {
    question: 'What is a group of lions called?',
    correctAnswer: 'Pride',
    otherAnswers: ['Pack', 'Herd', 'School', 'Flock']
  },
  {
    question: 'What is the fastest land animal?',
    correctAnswer: 'Cheetah',
    otherAnswers: ['Lion', 'Leopard', 'Horse', 'Gazelle']
  },
  {
    question: 'What is the largest land animal?',
    correctAnswer: 'African elephant',
    otherAnswers: ['Asian elephant', 'Giraffe', 'Hippopotamus']
  },
  {
    question: 'What word describes animals that are active at night?',
    correctAnswer: 'Nocturnal',
    otherAnswers: ['Herbivorous', 'Domestic', 'Endangered', 'Aquatic']
  },
  {
    question: 'What is the colored part of the eye called?',
    correctAnswer: 'Iris',
    otherAnswers: ['Retina', 'Pupil', 'Cornea', 'Lens']
  },
  {
    question: 'What is the largest internal organ in the human body?',
    correctAnswer: 'Liver',
    otherAnswers: ['Brain', 'Lung', 'Kidney', 'Stomach']
  },
  {
    question: 'What do red blood cells mainly carry around the body?',
    correctAnswer: 'Oxygen',
    otherAnswers: ['Carbon dioxide', 'Nitrogen', 'Calcium', 'Water']
  },
  {
    question: 'Which vitamin is produced when skin is exposed to sunlight?',
    correctAnswer: 'Vitamin D',
    otherAnswers: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin K']
  },
  {
    question: 'Which animal is known for being able to regenerate lost arms?',
    correctAnswer: 'Starfish',
    otherAnswers: ['Jellyfish', 'Seahorse', 'Lobster', 'Stingray']
  },
  {
    question: 'What structure do honeybees live in?',
    correctAnswer: 'Hive',
    otherAnswers: ['Nest', 'Burrow', 'Den', 'Stable']
  },
  {
    question: 'Which reptile is famous for changing color?',
    correctAnswer: 'Chameleon',
    otherAnswers: ['Gecko', 'Iguana', 'Crocodile', 'Tortoise']
  },
  {
    question: 'Which instrument measures air pressure?',
    correctAnswer: 'Barometer',
    otherAnswers: ['Thermometer', 'Hygrometer', 'Compass', 'Altimeter']
  },
  {
    question: 'What is the calm center of a hurricane called?',
    correctAnswer: 'Eye',
    otherAnswers: ['Eyewall', 'Front', 'Vortex', 'Core']
  },
  {
    question: 'Which type of cloud typically produces thunderstorms?',
    correctAnswer: 'Cumulonimbus',
    otherAnswers: ['Cirrus', 'Stratus', 'Cumulus', 'Altocumulus']
  },
  {
    question: 'At sea level, what is the boiling point of water in degrees Celsius?',
    correctAnswer: '100',
    otherAnswers: ['90', '80', '110', '120']
  },
  {
    question: 'What is a scientist who studies earthquakes called?',
    correctAnswer: 'Seismologist',
    otherAnswers: ['Meteorologist', 'Astronomer', 'Ecologist']
  },
  {
    question: 'What layer of Earth lies directly beneath the crust?',
    correctAnswer: 'Mantle',
    otherAnswers: ['Core', 'Atmosphere', 'Crust', 'Biosphere']
  },
  {
    question: 'What is the process called when water vapor turns into liquid water?',
    correctAnswer: 'Condensation',
    otherAnswers: ['Evaporation', 'Sublimation', 'Freezing']
  },
  {
    question: "What is molten rock called after it reaches Earth's surface?",
    correctAnswer: 'Lava',
    otherAnswers: ['Magma', 'Ash', 'Basalt', 'Granite']
  },
  {
    question: 'Who wrote 1984?',
    correctAnswer: 'George Orwell',
    otherAnswers: ['Aldous Huxley', 'J.R.R. Tolkien', 'Mark Twain']
  },
  {
    question: 'Who wrote Romeo and Juliet?',
    correctAnswer: 'William Shakespeare',
    otherAnswers: ['Leo Tolstoy', 'Jane Austen', 'Oscar Wilde']
  },
  {
    question: 'Who was the first President of the United States?',
    correctAnswer: 'George Washington',
    otherAnswers: ['Thomas Jefferson', 'John Adams', 'Abraham Lincoln']
  },
  {
    question: 'What ship carried the Pilgrims to America in 1620?',
    correctAnswer: 'Mayflower',
    otherAnswers: ['Santa Maria', 'Beagle', 'Endeavour', 'Victory']
  },
  {
    question: 'Which civilization built Machu Picchu?',
    correctAnswer: 'Inca',
    otherAnswers: ['Aztec', 'Maya', 'Roman', 'Egyptian']
  },
  {
    question: 'In which novel does Atticus Finch appear?',
    correctAnswer: 'To Kill a Mockingbird',
    otherAnswers: ['The Great Gatsby', '1984', 'Of Mice and Men']
  },
  {
    question: 'Who painted The Scream?',
    correctAnswer: 'Edvard Munch',
    otherAnswers: ['Claude Monet', 'Vincent van Gogh', 'Pablo Picasso']
  },
  {
    question: 'Which ancient wonder was located in Egypt?',
    correctAnswer: 'Pyramid of Giza',
    otherAnswers: ['Hanging Gardens of Babylon', 'Colossus of Rhodes', 'Temple of Artemis']
  },
  {
    question: 'What is the score of zero in tennis called?',
    correctAnswer: 'Love',
    otherAnswers: ['Nil', 'Blank', 'Duck', 'Zero']
  },
  {
    question: 'How many holes are in a standard round of golf?',
    correctAnswer: '18',
    otherAnswers: ['9', '12', '24', '27']
  },
  {
    question: 'What does a checker piece become when it reaches the opposite end of the board?',
    correctAnswer: 'King',
    otherAnswers: ['Queen', 'Crown', 'Rook', 'Knight']
  },
  {
    question: 'What is usually the highest card in poker?',
    correctAnswer: 'Ace',
    otherAnswers: ['King', 'Queen', 'Jack', 'Joker']
  },
  {
    question: 'What is the main ingredient in guacamole?',
    correctAnswer: 'Avocado',
    otherAnswers: ['Cucumber', 'Spinach', 'Zucchini', 'Celery']
  },
  {
    question: 'What is the main ingredient in hummus?',
    correctAnswer: 'Chickpeas',
    otherAnswers: ['Lentils', 'Black beans', 'Peas', 'Soybeans']
  },
  {
    question: 'What ingredient is commonly used to make pickles sour?',
    correctAnswer: 'Vinegar',
    otherAnswers: ['Sugar', 'Salt', 'Butter', 'Cinnamon']
  },
  {
    question: 'What do you call a word with the same meaning as another word?',
    correctAnswer: 'Synonym',
    otherAnswers: ['Antonym', 'Acronym', 'Homophone', 'Palindrome']
  },
  {
    question: 'What do you call words that sound alike but mean different things?',
    correctAnswer: 'Homophones',
    otherAnswers: ['Synonyms', 'Antonyms', 'Anagrams']
  },
  {
    question: 'What is the currency of the United Kingdom?',
    correctAnswer: 'Pound sterling',
    otherAnswers: ['Euro', 'US dollar', 'Swiss franc', 'Krona']
  },
  {
    question: 'What is the currency of India?',
    correctAnswer: 'Rupee',
    otherAnswers: ['Yen', 'Peso', 'Lira', 'Rand']
  },
  {
    question: 'What is the currency of Mexico?',
    correctAnswer: 'Peso',
    otherAnswers: ['Real', 'Baht', 'Rupee', 'Euro']
  },
  {
    question: 'What is the currency of Brazil?',
    correctAnswer: 'Real',
    otherAnswers: ['Peso', 'Euro', 'Lira', 'Franc']
  },
  {
    question: 'What is the currency of Switzerland?',
    correctAnswer: 'Swiss franc',
    otherAnswers: ['Euro', 'Krone', 'Pound sterling', 'Peso']
  },
  {
    question: 'What is the currency of Thailand?',
    correctAnswer: 'Baht',
    otherAnswers: ['Won', 'Krona', 'Rupee', 'Dinar']
  },
  {
    question: 'What is the currency of South Africa?',
    correctAnswer: 'Rand',
    otherAnswers: ['Lira', 'Peso', 'Franc', 'Baht']
  },
  {
    question: 'What is the currency of Poland?',
    correctAnswer: 'Zloty',
    otherAnswers: ['Koruna', 'Krone', 'Euro', 'Lira']
  },
  {
    question: 'What is the capital of Spain?',
    correctAnswer: 'Madrid',
    otherAnswers: ['Barcelona', 'Seville', 'Valencia', 'Lisbon']
  },
  {
    question: 'What is the capital of Portugal?',
    correctAnswer: 'Lisbon',
    otherAnswers: ['Porto', 'Madrid', 'Barcelona', 'Seville']
  },
  {
    question: 'What is the capital of Greece?',
    correctAnswer: 'Athens',
    otherAnswers: ['Sparta', 'Thessaloniki', 'Rome', 'Sofia']
  },
  {
    question: 'What is the capital of Turkey?',
    correctAnswer: 'Ankara',
    otherAnswers: ['Istanbul', 'Izmir', 'Antalya', 'Bursa']
  },
  {
    question: 'What is the capital of Peru?',
    correctAnswer: 'Lima',
    otherAnswers: ['Cusco', 'Quito', 'Santiago', 'La Paz']
  },
  {
    question: 'What is the capital of New Zealand?',
    correctAnswer: 'Wellington',
    otherAnswers: ['Auckland', 'Christchurch', 'Hamilton', 'Dunedin']
  },
  {
    question: 'Which country is home to the Taj Mahal?',
    correctAnswer: 'India',
    otherAnswers: ['Pakistan', 'Nepal', 'Bangladesh', 'Sri Lanka']
  },
  {
    question: 'Which country is home to Mount Fuji?',
    correctAnswer: 'Japan',
    otherAnswers: ['China', 'South Korea', 'Nepal', 'Thailand']
  },
  {
    question: 'Which country contains the city of Barcelona?',
    correctAnswer: 'Spain',
    otherAnswers: ['Portugal', 'Italy', 'France', 'Greece']
  },
  {
    question: 'Which country contains the city of Venice?',
    correctAnswer: 'Italy',
    otherAnswers: ['Spain', 'Croatia', 'France', 'Greece']
  },
  {
    question: 'Which country is Machu Picchu located in?',
    correctAnswer: 'Peru',
    otherAnswers: ['Chile', 'Bolivia', 'Ecuador', 'Argentina']
  },
  {
    question: 'What is the longest river in Europe?',
    correctAnswer: 'Volga',
    otherAnswers: ['Danube', 'Rhine', 'Seine', 'Thames']
  },
  {
    question: 'Which country is the largest in Africa by area?',
    correctAnswer: 'Algeria',
    otherAnswers: ['Sudan', 'Egypt', 'Libya', 'Ethiopia']
  },
  {
    question: 'Which desert stretches across northern China and southern Mongolia?',
    correctAnswer: 'Gobi',
    otherAnswers: ['Sahara', 'Kalahari', 'Atacama', 'Mojave']
  }
]

export async function startTrivia(context: EventContext, time: Duration): Promise<{ message: string; color: Color }> {
  const trivia = createQuiz()

  const timeout = new Timeout<User>(time.toMilliseconds())
  const incorrectUsers: User[] = []

  const listener = (event: ChatEvent) => {
    if (event.channelType !== ChannelType.Public) return

    const match = /^(\w)(?=\b)[\s!@#$%^&*()_+\-=`~?>|\\\][{}]*$/g.exec(event.message.toLowerCase().trim())
    if (!match) return
    const matchedResult = match[1].toLowerCase()

    if (!IndexLetters.includes(matchedResult)) return

    for (const answeredUsers of incorrectUsers) {
      if (answeredUsers.equalsUser(event.user)) return
    }

    if (matchedResult === trivia.answerLetter.toLowerCase()) {
      timeout.resolve(event.user)
    } else {
      incorrectUsers.push(event.user)
    }
  }

  context.application.on('chat', listener)
  await context.broadcastMessage(`Quick Trivia: ${trivia.question}`, Color.Good)
  timeout.refresh()

  const wonUser = await timeout.wait()
  context.application.off('chat', listener)

  // eslint-disable-next-line unicorn/prefer-ternary
  if (wonUser === undefined) {
    return {
      message: `The answer is: ${trivia.answerDisplay}. Remember you can only answer once and must be with the letter!`,
      color: Color.Info
    }
  } else {
    return { message: `Good job ${wonUser.displayName()}!`, color: Color.Good }
  }
}

function createQuiz(): { question: string; answerDisplay: string; answerLetter: string } {
  const trivia = TriviaEntries[Math.floor(Math.random() * TriviaEntries.length)]

  let question = trivia.question + '\n'

  const answers = [trivia.correctAnswer, ...trivia.otherAnswers]
  shuffleArrayInPlace(answers)

  for (const [index, answer] of answers.entries()) {
    question += `${IndexLetters[index].toUpperCase()}. ${answer}\n`
  }

  return {
    question: question.trim(),
    answerDisplay: trivia.correctAnswer,
    answerLetter: IndexLetters[answers.indexOf(trivia.correctAnswer)]
  }
}
