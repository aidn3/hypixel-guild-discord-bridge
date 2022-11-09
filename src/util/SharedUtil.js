function sufficeToTime(suffice) {
    suffice = suffice.toLowerCase().trim()

    if (suffice === "s" || !suffice) return 1 // default
    if (suffice === "m") return 60
    if (suffice === "h") return 60 * 60
    if (suffice === "d") return 60 * 60 * 24

    throw new Error(`Unexpected suffice: ${suffice}. Need a new update to handle the new one`)
}

function getDuration(short) {
    let regex = /(\d*)([smhd]*)/g
    let match = regex.exec(short)

    if (match != null) {
        let time = match[1]
        let suffice = match[2]
        return time * sufficeToTime(suffice)
    }

    throw new Error("Invalid short time")
}


module.exports = {sufficeToTime, getDuration}