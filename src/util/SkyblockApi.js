const {getNetworth, getPrices} = require('skyhelper-networth')

let prices = {};
getPrices().then((data) => prices = data);
setInterval(async () => prices = await getPrices(), 1000 * 60 * 5); // 5 minutes


module.exports.getNetworth = async (profileData, bankBalance) => {
    return getNetworth(profileData, bankBalance, {prices, onlyNetworth: true})
        .then(res => res.networth)
}

module.exports.getSelectedProfile = (playerUuid, profiles) => {
    let selectedProfile = profiles[0]
    for (let profile of profiles) {
        if (profile.members[playerUuid].last_save > selectedProfile.members[playerUuid].last_save) {
            selectedProfile = profile
        }
    }
    return selectedProfile
}

module.exports.localizedNetworth = (coins) => {
    let suffix = ""
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "k"
    }
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "m"
    }
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "b"
    }

    return coins.toFixed(3) + suffix
}