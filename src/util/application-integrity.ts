import type Application from '../application.js'
import type { BaseEvent, InstanceIdentifier } from '../common/application-event.js'
import { InstanceType } from '../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../common/instance.js'

/**
 * Application events communication is based on
 * instance identifiers {@link BaseEvent#instanceName} and {@link BaseEvent#instanceType}.
 *
 * Instances with the same identifiers can result in undefined behaviours.
 * It can range from desync to double responding to same event.
 *
 * This utility can be used before adding a new instance to the application
 * to ensure that an instance identifier is only being used by one instance.
 * Instances include all exposed and internal instances as well as plugins
 * and utilities. Instances across websockets are also included.
 *
 * Integrity checks:
 * - {@link #ensureInstanceUniqueness} checks if a given <code>instanceName</code> already exists
 * - {@link #ensureInstanceName} checks if a given <code>instanceName</code> isn't conformed to regex <code>[\w-]+</code>
 *   (with {@link InternalInstancePrefix} being allowed as a prefix)
 */
export default class ApplicationIntegrity extends Instance<InstanceType.Util> {
  private configPaths: string[] = []

  constructor(application: Application) {
    super(application, InternalInstancePrefix + 'ApplicationIntegrity', InstanceType.Util)
  }

  public checkEventIntegrity(name: string, event: BaseEvent): void {
    this.ensureInstanceName(event)

    const instances = this.application.getAllInstancesIdentifiers()
    this.checkLocalInstancesIntegrity(instances)

    if (!instances.some((instance) => instance.instanceName.toLowerCase() === event.instanceName.toLowerCase())) {
      const message =
        `Instance type=${event.instanceType},name=${event.instanceName} has sent an event type=${name}` +
        ` without first registering its identifiers by ${this.instanceName}.` +
        ` The event will be dropped entirely and an error will be thrown` +
        ` to notify the offending code that instigated this action.`

      this.logger.error(message)
      throw new Error(message)
    }
  }

  public checkLocalInstancesIntegrity(localInstances: InstanceIdentifier[]): void {
    for (const localInstance of localInstances) {
      this.ensureInstanceName(localInstance)
    }

    this.ensureInstanceUniqueness(localInstances)
  }

  public addConfigPath(configPath: string): void {
    const loweredCase = configPath.toLowerCase().trim()
    if (this.configPaths.includes(loweredCase)) {
      throw new Error(`Config path='${configPath}' is already in use`)
    }

    this.configPaths.push(loweredCase)
  }

  private ensureInstanceUniqueness(instances: InstanceIdentifier[]): void {
    if (instances.length <= 1) return

    for (let firstIndex = 0; firstIndex < instances.length - 1; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < instances.length; secondIndex++) {
        const firstInstance = instances[firstIndex]
        const instanceComparedTo = instances[secondIndex]

        if (firstInstance.instanceName.toLowerCase() === instanceComparedTo.instanceName.toLowerCase()) {
          throw new Error(
            `Instance type=${instanceComparedTo.instanceType},name=${instanceComparedTo.instanceName} violates the application integrity` +
              ` due to the name already being used by type=${firstInstance.instanceType},name=${firstInstance.instanceName}`
          )
        }
      }
    }
  }

  private ensureInstanceName(instance: InstanceIdentifier): void {
    const hasPrefix = instance.instanceName.startsWith(InternalInstancePrefix)
    const instanceName = hasPrefix ? instance.instanceName.slice(InternalInstancePrefix.length) : instance.instanceName

    const nameRegex = /[^\w-]+/g
    if (nameRegex.test(instanceName)) {
      let message =
        `Instance type=${instance.instanceType},name=${instanceName} violates the application integrity` +
        ` due to the name not conforming with regex ${nameRegex.source}.`
      if (hasPrefix)
        message += ` Prefix: ${InternalInstancePrefix} is allowed though and does not affect the requirements.`
      throw new Error(message)
    }
  }
}
