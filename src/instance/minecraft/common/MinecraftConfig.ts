import MineFlayer = require('mineflayer')

export default interface MinecraftConfig {
    email: string
    password: string

    // @ts-ignore
    botOptions: { client: MineFlayer.Client } & Partial<MineFlayer.BotOptions>
    bridgePrefix: string

    adminUsername: string

    commandPrefix: string
    disabledCommand: string[]
}