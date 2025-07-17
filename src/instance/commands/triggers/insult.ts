import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Insult extends ChatCommandHandler {
  public static readonly DefaultMessages = [
    '{username} would manage to trip over wireless connection',
    '{username}, if brains were taxed, you’d get a refund',
    '{username} is like a puzzle with half its pieces',
    '{username} plays like their controller’s unplugged',
    "{username}, if laziness were an Olympic sport, you'd still find a way to come in second",
    '{username} looks like they get dressed in the dark... with mittens on',
    '{username} has a face for podcasts',

    '{username} once got lost on a straight road',
    '{username} thought Bluetooth was a dental condition',
    '{username} tried to screenshot a piece of paper',
    '{username} looks like they got kicked out of the dollar store for being too broke',
    '{username} once googled how to open Google',
    '{username} tried to scroll a screenshot and got mad when it didn’t move',
    '{username} failed a personality quiz—twice',
    '{username} got a paper cut from a pdf',
    '{username} would lose a debate to a Magic 8 Ball',
    '{username} got friend-zoned by a Magic 8 Ball',
    '{username} studied for a blood test',
    "{username}'s thought process has a dial-up tone",
    '{username} has mastered the art of saying something without contributing at all',
    'I admire how {username} just speaks their mind. Even when no one asked',

    '{username}, You’re the reason God created the middle finger.',

    '{username} is like a pop-up ad: loud, pointless, and hard to get rid of',
    '{username}, You bring everyone so much joy… when you leave the room.',
    "{username}, You're like a cloud. When you disappear, it's a beautiful day.",
    "{username}, You're not stupid; you just have bad luck thinking.",
    "{username}, You're proof that evolution can go in reverse.",
    '{username}, Your secrets are always safe with me. I never even listen when you tell them.',
    "{username}, You're like a software update… always popping up at the worst time and doing absolutely nothing useful.",
    "{username}, You're the reason shampoo bottles have instructions.",
    "{username}, You're as sharp as a marble.",
    "{username}, You're like a WiFi signal—strong in the corner but gone when I actually need you.",
    '{username}, You have something on your chin… no, the third one down.',

    "{username}, You're like a mystery meat sandwich—nobody knows what you're made of, and we’re too afraid to ask.",
    "{username}, You're not totally useless—you can always serve as a bad example.",
    "{username}, You're like a software demo: limited, glitchy, and expires quickly.",
    "{username}, You're the human version of a participation trophy.",
    '{username}, If I had a dollar for every smart thing you said, I’d be broke.',
    "{username}, You're like a Slinky. Not really good for anything, but you bring a smile when pushed down the stairs.",
    "{username}, You're not annoying. You’re just... consistently disappointing.",
    "{username}, You're the kind of person who trips over a wireless signal.",
    "{username}, You're like a puzzle with half the pieces missing and none of the edge ones.",
    "{username}, You're the reason they put directions on Pop-Tarts.",
    "{username}, You're like a Netflix show with 9 seasons—should’ve ended after 2.",
    '{username}, You bring so much confusion, you could be a math word problem.',
    "{username}, You're the kind of person who claps when the plane lands.",
    '{username}, Your brain is on airplane mode and forgot to reconnect.',
    "{username}, You're like a speed bump—unnecessary and mildly irritating.",
    "{username}, You're not the sharpest tool in the shed, but at least you're in there... somewhere.",
    "{username}, You're like a WiFi signal in a bunker—just not reaching anyone.",
    "{username}, You're like a phone at 1%—barely hanging on and causing panic.",
    "{username}, You're the human equivalent of a typo.",

    "{username}, You're like a Bluetooth speaker at a party—loud, annoying, and someone always tries to disconnect you.",
    '{username}, You’d lose a battle of wits with a salad.',
    "{username}, You're about as edgy as a marshmallow.",
    '{username}, You have something special... it’s just well hidden. Like, really well.'
  ]

  constructor() {
    super({
      triggers: ['insult'],
      description: 'insult a player',
      example: `insult %s`
    })
  }

  handler(context: ChatCommandContext): string {
    const givenUsername = context.args[0] ?? context.username

    const messages = Insult.DefaultMessages
    let message = messages[Math.floor(Math.random() * messages.length)]
    message = message.replaceAll('{username}', givenUsername)

    return message
  }
}
