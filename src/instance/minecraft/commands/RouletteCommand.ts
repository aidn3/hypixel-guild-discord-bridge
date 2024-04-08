import { ChatCommandContext, ChatCommandHandler } from "../common/ChatInterface"

const LossMessages = [
  "%s you got blasted!",
  "%s unlucky, wrong choice.",
  "%s it's not rigged, I promise!",
  "%s you got capped.",
  "%s enjoy the mute, haha!",
  "%s better luck next time. Or not..."
]

const WinMessages = [
  "%s you survived?!",
  "%s, lucky. Do it again!",
  "%s? Alive? shame.",
  "%s, I'll get you next time",
  "%s, perhaps I forgot to load it?",
  "%s you're crazy. Again again again!"
]

let countSinceLastLose = 0

export default {
  name: "Roulette",
  triggers: ["roulette", "rr"],
  description: "Try your luck for a 15 minute mute",
  example: `rr`,
  enabled: true,

  handler: async function (context: ChatCommandContext): Promise<string> {
    // Default behaviour which is just "1/6 chance" is too unreliable
    // Some even managed to reach 24 win streak.
    // This will increase the chance of losing and cap the win streak as well

    const chance = 1 / 6
    const increasedLoseChanceAfter = 6
    const guaranteedLoseOn = 12

    let currentChance = chance

    if (countSinceLastLose > increasedLoseChanceAfter) {
      // This function has a starting point of (0,0) and goes to (inf,1)
      // with an increasingly faster slope with every step
      currentChance += -(1 / ((countSinceLastLose - increasedLoseChanceAfter) / 24 + 1)) + 1
    }
    if (countSinceLastLose >= guaranteedLoseOn) {
      currentChance = 1
    }

    if (Math.random() < currentChance) {
      countSinceLastLose = 0

      await context.clientInstance.send(`/g mute ${context.username} 15m`)
      context.clientInstance.app.punishedUsers.mute(context.username, 900)

      return LossMessages[Math.floor(Math.random() * LossMessages.length)].replaceAll("%s", context.username)
    } else {
      countSinceLastLose++
    }

    return WinMessages[Math.floor(Math.random() * WinMessages.length)].replaceAll("%s", context.username)
  }
} satisfies ChatCommandHandler
