/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { ChatCommandContext, ChatCommandHandler } from "../common/ChatInterface"

const ANSWERS = [
  "As I see it, yes.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
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

export default {
  name: "8Ball",
  triggers: ["8ball", "8balls", "8", "ball", "balls", "8b"],
  description: "Returns a basic 8 ball response",
  example: `8b am I cool?`,
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    return `${context.username}, ${ANSWERS[Math.floor(Math.random() * ANSWERS.length)]}`
  }
} satisfies ChatCommandHandler
