let facts = require('../../../config/minecraft-facts.json')
const MINECRAFT_CONFIG = require("../../../config/minecraft-config.json")

const coolDown = new (require("cooldown"))(MINECRAFT_CONFIG.commands.factsCoolDown)

module.exports = {
    triggers: ['fact', 'facts', 'f'],
    handler: function (clientInstance, reply, username, args) {
        if (!coolDown.fire()) return

        let randomIndex = Math.floor(Math.random() * facts.length)
        let selectedIndex = Math.abs(Math.floor(Number(args[0])))
        let index = (selectedIndex || selectedIndex === 0) ? Math.min(selectedIndex, facts.length - 1) : randomIndex

        let fact = facts[index]
        reply(fact)
    }
}