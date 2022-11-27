/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
module.exports = {
    triggers: ['bitch', 'bitches', 'b'],
    handler: function (clientInstance, username, args) {
        let givenUsername = args[0] !== undefined ? args[0] : username
        return `${givenUsername} has ${Math.floor(Math.random() * 10)} b's`
    }
}