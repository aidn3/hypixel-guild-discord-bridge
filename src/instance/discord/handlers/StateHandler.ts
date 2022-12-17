import EventHandler from '../../../common/EventHandler'
import DiscordInstance from "../DiscordInstance"

export default class StateHandler extends EventHandler<DiscordInstance> {

    constructor(clientInstance: DiscordInstance) {
        super(clientInstance)
    }

    registerEvents() {
        (<DiscordInstance>this.clientInstance).client.on('ready', () => this.onReady())
    }

    private onReady() {
        this.clientInstance.logger.info('Discord client ready, logged in as ' + this.clientInstance.client.user?.tag)
    }
}
