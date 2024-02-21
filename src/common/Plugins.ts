import Application from '../Application'
import { ClientInstance } from './ClientInstance'

export interface PluginInterface {
  onRun: (context: PluginContext) => void
}

export interface PluginContext {
  application: Application
  getLocalInstance: (instanceName: string) => ClientInstance<unknown> | undefined
}
