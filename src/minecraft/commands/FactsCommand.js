let facts = require('../../../config/minecraft-facts.json')


module.exports = {
    triggers: ['fact', 'facts', 'f'],
    handler: function (clientInstance, reply, username, args) {

        let randomIndex = Math.floor(Math.random() * facts.length)
        let selectedIndex = Math.abs(Math.floor(Number(args[0])))
        let index = (selectedIndex || selectedIndex === 0) ? Math.min(selectedIndex, facts.length - 1) : randomIndex

        let fact = facts[index]
        reply(fact)
    }
}