/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const {SlashCommandBuilder} = require('@discordjs/builders')
const fetch = require("axios");
const {Index} = require("flexsearch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bin')
        .setDescription('Search lowest bin of an item.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name')
                .setRequired(true)),
    permission: 0, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let itemname = interaction.options.getString("item")

        let foundItem = await findItem(itemname)

        if (!foundItem) {
            interaction.editReply(`${itemname} does not exist!`)
        } else {
            interaction.editReply(`${foundItem.name}'s lbin is ${localizedPrice(foundItem.lowestBin)}`)
        }

    }
}

let index = new Index()
let cache
let lastRetrieve = 0

async function refreshCache() {
    if (!cache || lastRetrieve + 300 * 1000 < new Date().getTime()) {
        let data = await fetch('https://skyblock.acebot.xyz/api/auctions/all')
            .then(res => res.data.data)

        for (let i = 0; i < data.length; i++) {
            index.add(i, data[i].id)
            index.append(i, data[i].name)
        }

        cache = data
    }

}

async function findItem(search) {
    await refreshCache()

    let result = index.search(search, 1)
    if (result.length >= 0) return cache[result[0]]
}

function localizedPrice(coins) {
    let suffix = ""
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "k"
    }
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "m"
    }

    return parseFloat(coins.toFixed(3)) + suffix
}
