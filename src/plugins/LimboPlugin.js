function limbo(clientInstance) {
    clientInstance.logger.debug(`Spawn event triggered. sending to limbo...`)
    clientInstance.send("§")
}

/*
 * Stuck minecraft client in limbo and prevent it from ever leaving
 */
module.exports = (application) => {
    application.on("minecraft.client.create", ({clientInstance}) => {
        clientInstance.client.on("spawn", () => limbo(clientInstance))
        clientInstance.client.on("respawn", () => limbo(clientInstance))
    })
}