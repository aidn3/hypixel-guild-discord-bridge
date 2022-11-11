const MESSAGES = [
    "Welcome %s to our guild!",
    "%s, What a nice new member :)",
    "Psst %s. You just joined. Do /g discord :D",
    "%s since you just joined, do !e",
    "Hi %s, I'll tell you once since you just joined. I'm a fragbot. Party me if needed.",
    "Can we just take a moment to applaud %s for joining us :3",
    "%s is op for joining the guild",
    "hey %s and welcome to the guild!",
    "%s Nice, new member"
]

module.exports = (application) => {
    application.on("minecraft.event.join", ({username}) => {
        let message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        message = message.replaceAll("%s", username)
        application.sendMinecraftCommand(`/gc ${message}`)
    })
}
