const {evalExpression} = require('@hkh12/node-calc');

module.exports = {
    triggers: ['calculate', 'calc', 'c'],
    handler: async function (clientInstance, reply, username, args) {
        if (args.length === 0) {
            reply(`${username}, example: /calc 1 + 1`)
            return
        }
        let expression = args.join(" ")
        let result = evalExpression(expression)
        reply(`${username}, ${expression} = ${result}`)
    }
}