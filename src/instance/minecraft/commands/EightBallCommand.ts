/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import {MinecraftCommandMessage} from "../common/ChatInterface"
import MinecraftInstance from "../MinecraftInstance"

const ANSWERS = [
    "As I see it, yes.",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now.",
    "Concentrate and ask again.",
    "Don’t count on it.",
    "It is certain.",
    "It is decidedly so.",
    "Most likely.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Outlook good.",
    "Reply hazy, try again.",
    "Signs point to yes.",
    "Very doubtful.",
    "Without a doubt.",
    "Yes.",
    "Yes – definitely.",
    "You may rely on it."
]

export default <MinecraftCommandMessage>{
    triggers: ['8balls', '8ball', '8', 'ball', 'balls', '8b'],
    enabled: true,

    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
        return `${username}, ${ANSWERS[Math.floor(Math.random() * ANSWERS.length)]}`
    }
}