// noinspection JSUnusedGlobalSymbols

/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from "../MinecraftInstance"
const {evalExpression} = require('@hkh12/node-calc')

import {MinecraftCommandMessage} from "../common/ChatInterface"

export default <MinecraftCommandMessage>{
    triggers: ['calculate', 'calc', 'c'],
    enabled: true,

    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
        if (args.length === 0) return `${username}, example: /calc 1 + 1`

        let expression = args.join(" ")
        let result = evalExpression(expression)
        return `${username}, ${expression} = ${result}`
    }
}
