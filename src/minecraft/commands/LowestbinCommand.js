/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const fetch = require("axios");
const {Index} = require("flexsearch");

module.exports = {
    triggers: ['lowestbin', 'lbin', 'lb'],
    handler: async function (clientInstance, username, args) {

        if (args.length === 0) {
            return `${username}, at least give an item name.`
        }

        let item = args.join(" ")
        let foundItem = await findItem(item)

        if (!foundItem) {
            return `${username}, item does not exists. Try to be more specific maybe?`
        }

        return `${foundItem.name}'s lbin is ${localizedPrice(foundItem.lowestBin)}`
    }
}

let index = new Index()
let cache
let lastRetrieve = 0

async function refreshCache() {
    if (!cache || lastRetrieve + 300 * 1000 < new Date().getTime()) {
        let data = await fetch('https://maro.skybrokers.xyz/api/auctions/all')
            .then(res => res.data.data)

        for (let i = 0; i < data.length; i++) {
            index.add(i, data[i].id)
            index.append(i, data[i].name)
        }

        cache = data
    }

    console.log(`cached ${cache.length}`)
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