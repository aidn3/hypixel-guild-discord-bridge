import fs = require('fs')
import {ChatMessage} from "prismarine-chat"

import MinecraftInstance from "./MinecraftInstance"
import EventHandler from "../../common/EventHandler"
import {MinecraftChatMessage} from "./common/ChatInterface"

const PATH = './src/instance/minecraft/chat'
const chatEvents: MinecraftChatMessage[] =
    fs.readdirSync(PATH)
        .filter((file: string) => file.endsWith('Chat.ts'))
        .map((f: string) => require(`./chat/${f}`).default)

export default class ChatManager extends EventHandler<MinecraftInstance> {
    constructor(clientInstance: MinecraftInstance) {
        super(clientInstance)
    }

    registerEvents() {
        this.clientInstance.client?.on('message', (message: ChatMessage) => this.onMessage(message.toString().trim()))
    }

    private onMessage(message: string): void {
        require("./chat/BlockChat").default.onChat()
        chatEvents.forEach(e => e.onChat(this.clientInstance, message))
    }
}