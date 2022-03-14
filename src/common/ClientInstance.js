const logger = require("log4js")

class ClientInstance {
    instanceName;
    bridge;
    logger;

    constructor(instanceName, bridge) {
        this.instanceName = instanceName
        this.bridge = bridge
        this.logger = logger.getLogger(instanceName)
    }

    connect() {
        throw new Error("method not implemented yet")
    }
}

module.exports = ClientInstance