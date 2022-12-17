import MineFlayer = require('mineflayer')

export default interface MinecraftConfig {
    instanceName: string
    adminUsername: string

    bridgePrefix: string
    commandPrefix: string
    disabledCommand: string[]

    // @ts-ignore
    botOptions: { client: MineFlayer.Client } & Partial<MineFlayer.BotOptions>
}