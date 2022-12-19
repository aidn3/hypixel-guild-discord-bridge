import {io, Socket} from "socket.io-client"

import {ClientInstance, LOCATION, SCOPE} from "../../common/ClientInstance"
import Application from "../../Application"
import {ChatEvent} from "../../common/ApplicationEvent"

const GLOBAL_CHAT_KEY = <string | undefined>process.env.GLOBAL_CHAT_KEY

export default class GlobalChatInstance extends ClientInstance {
    private readonly clientOptions
    private client: Socket | undefined

    constructor(app: Application, instanceName: string, clientOptions: any) {
        super(app, instanceName, LOCATION.GLOBAL)
        this.clientOptions = clientOptions

        this.app.on("chat", event => this.onMessageSend(event))
    }

    async connect() {
        if (!GLOBAL_CHAT_KEY) {
            this.logger.info(`GlobalChat disabled since no key is given. Contact the developer for a key`)
            return undefined
        }

        let authData = {accessKey: GLOBAL_CHAT_KEY}
        this.client = io(this.clientOptions.hostname, {auth: authData})

        this.client.on("connect", () => console.log("Logged in"))

        this.client.on("Message", (payload: string) => this.onMessageReceive(payload))
    }

    private async onMessageSend(event: ChatEvent) {
        if (event.instanceName === this.instanceName) return


        if (event.scope === SCOPE.PUBLIC) {
            let payload = JSON.stringify({
                username: null,
                displayName: event.username,
                message: event.message,
                replyUsername: event.replyUsername,
                self: true
            })
            await this.client?.emit("Message", payload)
        }
    }

    private onMessageReceive(payload: string): void {
        let parsed = JSON.parse(payload)
        if (parsed.self) return

        let username = parsed.displayName ? parsed.displayName : parsed.username

        if (this.app.punishedUsers.mutedTill(username)) {
            this.logger.debug(`${username} is muted. ignoring this Global message.`)
            return
        }

        this.app.emit("chat", {
            instanceName: this.instanceName,
            location: LOCATION.GLOBAL,
            scope: SCOPE.PUBLIC,
            username: username,
            channelId: undefined,
            replyUsername: undefined,
            message: parsed.message
        })
    }
}
