/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
module.exports = {
    triggers: ['bitch', 'bitches', 'b'],
    handler: function (clientInstance, reply, username, args) {
        let givenUsername = args[0] !== undefined ? args[0] : username
        reply(`${givenUsername} has ${Math.floor(Math.random() * 10)} bitches`)
    }
}