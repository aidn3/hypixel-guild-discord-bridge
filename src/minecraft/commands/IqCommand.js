/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
module.exports = {
    triggers: ['iq'],
    handler: function (clientInstance, reply, username, args) {
        let givenUsername = args[0] !== undefined ? args[0] : username
        reply(`${givenUsername} has an IQ of ${Math.floor(Math.random() * 200)}`)
    }
}