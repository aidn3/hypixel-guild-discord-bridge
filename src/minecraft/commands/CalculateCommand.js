/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const {evalExpression} = require('@hkh12/node-calc');

module.exports = {
    triggers: ['calculate', 'calc', 'c'],
    handler: function (clientInstance, username, args) {
        if (args.length === 0) return `${username}, example: /calc 1 + 1`

        let expression = args.join(" ")
        let result = evalExpression(expression)
        return `${username}, ${expression} = ${result}`
    }
}