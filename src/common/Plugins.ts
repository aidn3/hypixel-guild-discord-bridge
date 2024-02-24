import type Application from '../Application'
import type { ClientInstance } from './ClientInstance'

export interface PluginInterface {
  onRun: (context: PluginContext) => void
}

export interface PluginContext {
  application: Application
  getLocalInstance: (instanceName: string) => ClientInstance<unknown> | undefined
}
