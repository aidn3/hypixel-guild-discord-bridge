/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'

// @ts-expect-error Type not exist. (expr: string) => number
import { evalExpression } from '@hkh12/node-calc'

export default {
  triggers: ['calculate', 'calc', 'c'],
  enabled: true,

  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    if (args.length === 0) return `${username}, example: /calc 1 + 1`

    const expression = args.join(' ')
    const result = evalExpression(expression) as string
    return `${username}, ${expression} = ${result}`
  }
} satisfies MinecraftCommandMessage
