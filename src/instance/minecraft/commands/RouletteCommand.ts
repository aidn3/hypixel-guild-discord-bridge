import { MinecraftCommandMessage } from '../common/ChatInterface'
import MinecraftInstance from '../MinecraftInstance'

const LossMessages = [
  '%s you got blasted!',
  '%s unlucky, wrong choice.',
  "%s it's not rigged, I promise!",
  '%s you got capped.',
  '%s enjoy the mute, haha!',
  '%s better luck next time. Or not...'
]

const WinMessages = [
  '%s you survived?!',
  '%s lucky. Do it again!',
  '%s alive? shame.',
  "%s I'll get you next time",
  '%s perhaps i forgot to load it?',
  "%s you're crazy. Again again again!"
]

export default {
  triggers: ['rr', 'roulette'],
  enabled: true,

  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const choice = Number(args[0])

    if (choice < 1 || choice > 6) {
      return `${username}, a revolver only has 6 bullets.`
    }

    const random = Math.floor(Math.random() * 6 + 1)

    if (choice === random) {
      await clientInstance.send(`/gc mute ${username} 15m`)
      clientInstance.app.punishedUsers.mute(username, 900)

      return LossMessages[Math.floor(Math.random() * LossMessages.length)].replaceAll('%s', username as string)
    }

    return WinMessages[Math.floor(Math.random() * WinMessages.length)].replaceAll('%s', username as string)
  }
} satisfies MinecraftCommandMessage
