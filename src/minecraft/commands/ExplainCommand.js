module.exports = {
    triggers: ['explain', 'e'],
    handler: function (clientInstance, username, args) {
        return `${username}, this is a bridge that connects guild's discord server`
            + ` with guild's chat. Any message you send will will go to the other`
            + ` side. That way, you can chat with your friends within in-game from`
            + ` the discord. Have fun while you are away!`
    }
}