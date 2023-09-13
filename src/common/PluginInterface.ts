import Application from '../Application'
import { ClientInstance } from './ClientInstance'

export default interface PluginInterface {
  onRun: (app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined) => any
}
