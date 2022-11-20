const {getEventListeners} = require("events")

/*
 * Event 'messagestr' is used by some complicated regex that can take MINUTES to resolve
 * Those internal feature that uses the regex aren't needed by this project.
 * Hence removing them will improve client stability
 */
module.exports = (application) => {
    application.on("minecraft.client.create", ({clientInstance}) => {
        clientInstance.client.on('messagestr', () => {
            console.log("Removing buggy code")
            let listeners = getEventListeners(clientInstance.client, 'messagestr')
            listeners.forEach(l => clientInstance.client.removeListener('messagestr', l))
        })
    })
}
