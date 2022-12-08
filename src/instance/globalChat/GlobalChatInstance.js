const {io} = require("socket.io-client")
const {SCOPE, ClientInstance} = require("../../common/ClientInstance")

const GLOBAL_CHAT_KEY = process.env.GLOBAL_CHAT_KEY

class GlobalChatInstance extends ClientInstance {
    #clientOptions
    client

    constructor(app, instanceName, clientOptions) {
        super(app, instanceName)
        this.#clientOptions = clientOptions

        this.app.on("*.chat", async ({clientInstance, scope, username, replyUsername, message}) => {
            if (clientInstance === this) return


            if (scope === SCOPE.PUBLIC) {
                let payload = JSON.stringify({
                    username: null,
                    displayName: username,
                    message: message,
                    replyUsername: replyUsername,
                    self: true
                })
                await this.client?.emit("Message", payload)
            }
        })
    }

    async connect() {
        if (!GLOBAL_CHAT_KEY) {
            this.logger.info(`GlobalChat disabled since key is given. Contact the developer for a key`)
            return undefined
        }

        let authData = {accessKey: GLOBAL_CHAT_KEY}
        this.client = io(this.#clientOptions.hostname, {auth: authData})

        this.client.on("connect", () => {
            console.log("Logged in")
        })

        this.client.on("Message", (payload) => {
            let parsed = JSON.parse(payload)
            if (parsed.self) return

            let username = parsed.displayName ? parsed.displayName : parsed.username

            if (this.app.punishedUsers.mutedTill(username)) {
                this.logger.debug(`${username} is muted. ignoring this Global message.`)
                return
            }

            this.app.emit("global.chat", {
                clientInstance: this,
                scope: SCOPE.PUBLIC,
                username: username,
                replyUsername: null,//TODO: find way to get replyUsername for webhooks (if possible at all)
                message: parsed.message
            })
        })
    }
}

module
    .exports = GlobalChatInstance