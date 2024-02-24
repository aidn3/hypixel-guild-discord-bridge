import type Application from '../application'
import type { ClientInstance } from './client-instance'

export interface PluginInterface {
  onRun: (context: PluginContext) => void
}

export interface PluginContext {
  application: Application
  getLocalInstance: (instanceName: string) => ClientInstance<unknown> | undefined
}
