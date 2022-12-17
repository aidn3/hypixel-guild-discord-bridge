import * as fs from 'fs'
import * as YAML from 'yaml'

import WebhookConfig from "./instance/webhook/common/WebhookConfig"
import {DiscordConfig} from "./instance/discord/common/DiscordConfig"
import GlobalConfig from "./instance/globalChat/common/GlobalConfig"
import MetricsConfig from "./instance/metrics/common/MetricsConfig"
import MinecraftConfig from "./instance/minecraft/common/MinecraftConfig"

export function loadApplicationConfig(): ApplicationConfig {
    let fileString = fs.readFileSync("./config.yaml", 'utf8')
    let config = YAML.parse(fileString)

    return <ApplicationConfig>{
        general: config.general,
        metrics: config.metrics,
        plugins: config.plugins,
        profanityFilter: config.profanity,

        discord: config.discord,
        minecrafts: parseMinecraftInstances(config.minecraft),
        webhooks: config.webhooks,
        global: config.global,
    }
}

function parseMinecraftInstances(minecraftYaml: any & { instances: any[] }) {
    let arr: MinecraftConfig[] = []

    for (let instanceYaml of minecraftYaml.instances) {
        let config: any[string] = {}
        for (let key of Object.keys(minecraftYaml)) {
            if (key === "instances") continue
            config[key] = minecraftYaml[key]
        }

        config.botOptions.auth = "microsoft"
        config.botOptions.username = instanceYaml.email
        config.botOptions.password = instanceYaml.password

        arr.push(config)
    }

    return arr
}

export interface ApplicationConfig {
    general: GeneralConfig
    plugins: PluginsConfig
    metrics: MetricsConfig

    discord: DiscordConfig
    global: GlobalConfig

    minecrafts: MinecraftConfig[]
    webhooks: WebhookConfig[]
    profanityFilter: ProfanityFilterConfig
}

export interface PluginsConfig {
    allowSocketInstance: boolean
}

export interface ProfanityFilterConfig {
    enabled: boolean
    whitelisted: string[]
}

export interface GeneralConfig {
    hypixelApiKey: string
    displayInstanceName: boolean
}