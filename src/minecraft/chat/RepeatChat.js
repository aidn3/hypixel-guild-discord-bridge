const {SCOPE} = require("../../common/ClientInstance")
const COLOR = require('../../../config/discord-config.json').events.color

const MESSAGES = [
    "can't repeat same message...",
    "I wish I had a way to repeat same messages over and over again :(",
    "Hypixel blocked this message for repeating... again! D:",
    "Hold down your horses, can't say same message twice!",
    "twinkle twinkle little star, can't repeat message with big R",
    "No, no, no, NO. no message repetition D:",
    "RIP, can't say same thing twice",
    "Wonder where the message have gone? Yeah... can't repeat it :P",
    "Message can not be repeated!",
    "The verdict has been given and will not be repeated!",
    "I once tried to say something twice, but then hypixel gave me the L and denied my privilege. Now I can't say the same message twice. Rest in peace my thought.",
    "Not saying it twice, bro!",
    "Oh no, I tried to send same message but Hypixel annoying and blocked me!",
    "Oni-chan, you are big meanie. Don't block my message even it is repeated!"
]

let lastWarning = 0

module.exports = function (clientInstance, message) {
    let regex = /^You cannot say the same message twice!/g

    let match = regex.exec(message)
    if (match != null) {

        clientInstance.app.emit("minecraft.event.repeat", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: null,
            severity: COLOR.INFO,
            message: message,
            removeLater: true
        })

        if (lastWarning + 5000 < new Date().getTime()) {
            clientInstance.send(`/gc @${MESSAGES[Math.floor(Math.random() * MESSAGES.length)]}`)
            lastWarning = new Date().getTime()
        }

        return true
    }
}