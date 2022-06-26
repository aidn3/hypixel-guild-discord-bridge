const {io} = require("socket.io-client")
const {SCOPE, ClientInstance} = require("../common/ClientInstance")

const GLOBAL_URL = process.env.GLOBAL_URL

class GlobalChatInstance extends ClientInstance {
    client

    constructor(app, instanceName) {
        super(app, instanceName)

        this.app.on("*.chat", async ({clientInstance, scope, username, replyUsername, message}) => {
            if (clientInstance === this) return

            if (scope === SCOPE.PUBLIC) {
                let payload = JSON.stringify({
                    username: username,
                    message: message,
                    replyUsername: replyUsername,
                    self: true
                })
                await this.client?.emit("message", payload)
            }
        })
    }

    async connect() {
        this.client = io(GLOBAL_URL)
        this.client.on("message", (payload) => {
            let parsed = JSON.parse(payload)
            if(parsed.self) return

            this.app.emit("global.chat", {
                clientInstance: this,
                scope: SCOPE.PUBLIC,
                username: parsed.username,
                replyUsername: null,//TODO: find way to get replyUsername for webhooks (if possible at all)
                message: parsed.message
            })
        })
    }
}

module.exports = GlobalChatInstance