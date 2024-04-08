import Application from "../Application"
import { ClientInstance } from "./ClientInstance"

export interface PluginInterface {
  onRun: (context: PluginContext) => void
}

export interface PluginContext {
  application: Application
  config: PluginsConfig
  getLocalInstance: (instanceName: string) => ClientInstance<unknown> | undefined
}

export interface PluginsConfig {
  enabled: boolean
  allowSocketInstance: boolean
  paths?: string[]
}
