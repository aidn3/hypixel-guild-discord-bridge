import { ChannelType, Color, MinecraftChatEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

const Messages = [
  "Can't repeat the same message...",
  'I wish I had a way to repeat the same messages over and over again :(',
  'Hypixel blocked this message for repeating... Again! D:',
  "Hold your horses, can't say same message twice!",
  "Twinkle twinkle little star, can't repeat message with big R",
  'No, no, no, NO. no message repetition D:',
  "RIP, can't say same thing twice",
  "Wonder where the message has gone? Yeah... Can't repeat it :P",
  'Message cannot be repeated!',
  'The verdict has been given and will not be repeated!',
  'Not saying it twice, bro!',
  'Oh no, I tried to send same message but Hypixel is annoying and blocked me!',
  "Onii-chan, you are big meanie. Don't block my message even if it's repeated!"
]

let lastWarning = 0

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^You cannot say the same message twice!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const randomMessage = Messages[Math.floor(Math.random() * Messages.length)]

      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        channels: [ChannelType.Public],

        type: MinecraftChatEventType.Repeat,
        originEventId: context.clientInstance.getLastEventIdForSentChatMessage(),
        message: randomMessage
      })

      if (lastWarning + 5000 < Date.now()) {
        void context.clientInstance
          .send(`/gc @${randomMessage}`, undefined)
          .catch(context.errorHandler.promiseCatch('sending message about repeating in chat'))
        lastWarning = Date.now()
      }
    }
  }
} satisfies MinecraftChatMessage
