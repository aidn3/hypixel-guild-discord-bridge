import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color } from '../../../common/application-event'
import type { User } from '../../../common/user'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import Duration from '../../../utility/duration'
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

    const result = await startTrivia(context, Duration.seconds(30))
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
