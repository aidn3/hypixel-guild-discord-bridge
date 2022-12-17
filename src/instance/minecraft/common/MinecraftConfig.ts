import MineFlayer = require('mineflayer')

export default interface MinecraftConfig {
    // @ts-ignore
    botOptions: { client: MineFlayer.Client } & Partial<MineFlayer.BotOptions>
    bridgePrefix: string

    adminUsername: string

    commandPrefix: string
    disabledCommand: string[]
}