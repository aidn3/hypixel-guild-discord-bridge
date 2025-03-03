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
 * and utilities.Instances across websockets are also included.
 *
 * Integrity checks:
 * - {@link #ensureInstanceUniqueness} checks if a given <code>instanceName</code> already exists
 * - {@link #ensureInstanceName} checks if a given <code>instanceName</code> isn't conformed to regex <code>[\w-]+</code>
 *   (with {@link InternalInstancePrefix} being allowed as a prefix)
 */
export default class ApplicationIntegrity extends Instance<void, InstanceType.Util> {
  private readonly localInstanceIdentifier: InstanceIdentifier[] = []
  private readonly remoteApplications = new Map<number, InstanceIdentifier[]>()
  private lastApplicationId = -1

  private remoteEventsIntegrity = true
  private cachedInstances: InstanceIdentifier[] | undefined
  private cachedInvalidated = true

  constructor(application: Application) {
    super(application, InternalInstancePrefix + 'ApplicationIntegrity', InstanceType.Util)
    this.addLocalInstance(this)
  }

  public enableRemoteEventsIntegrity(enabled: boolean): void {
    this.remoteEventsIntegrity = enabled
  }

  public checkEventIntegrity(name: string, event: BaseEvent): void {
    if (!event.localEvent && !this.remoteEventsIntegrity) return

    if (this.cachedInstances === undefined || this.cachedInvalidated) {
      this.cachedInvalidated = false
      this.cachedInstances = [...this.localInstanceIdentifier, ...this.remoteApplications.values().toArray().flat()]
    }

    if (
      !this.cachedInstances.some((instance) => instance.instanceName.toLowerCase() === event.instanceName.toLowerCase())
    ) {
      const message =
        `Instance type=${event.instanceType},name=${event.instanceName} has sent an event type=${name}` +
        ` without first registering its identifiers by ${this.instanceName}.` +
        ` The event will be dropped entirely and an error will be thrown` +
        ` to notify the offending code that instigated this action.`

      this.logger.error(message)
      throw new Error(message)
    }
  }

  public addRemoteApplication(applicationId: number, instances: InstanceIdentifier[]): number {
    if (applicationId < 0) applicationId = ++this.lastApplicationId

    const checkedInstances: InstanceIdentifier[] = []
    this.remoteApplications.set(applicationId, checkedInstances)

    const registeredInstances = [...this.localInstanceIdentifier, ...this.remoteApplications.values().toArray().flat()]
    for (const instance of instances) {
      this.ensureInstanceName(instance)
      this.ensureInstanceUniqueness(registeredInstances, instance)

      checkedInstances.push(instance)
      registeredInstances.push(instance)
      this.cachedInvalidated = true
    }

    return applicationId
  }

  public addLocalInstance(instance: InstanceIdentifier): void {
    this.ensureInstanceName(instance)

    const registeredInstances = [...this.localInstanceIdentifier, ...this.remoteApplications.values().toArray().flat()]
    this.ensureInstanceUniqueness(registeredInstances, instance)
    this.localInstanceIdentifier.push(instance)
    this.cachedInvalidated = true
  }

  private ensureInstanceUniqueness(
    registeredInstances: InstanceIdentifier[],
    targetInstance: InstanceIdentifier
  ): void {
    const foundInstance = registeredInstances.find(
      (instance) => instance.instanceName.toLowerCase() === targetInstance.instanceName.toLowerCase()
    )

    if (foundInstance !== undefined) {
      throw new Error(
        `Instance type=${targetInstance.instanceType},name=${targetInstance.instanceName} violates the application integrity` +
          ` due to the name already being used by type=${foundInstance.instanceType},name=${foundInstance.instanceName}`
      )
    }
  }

  private ensureInstanceName(instance: InstanceIdentifier): void {
    const nameRegex = /[^\w-]+/g
    if (nameRegex.test(instance.instanceName)) {
      throw new Error(
        `Instance type=${instance.instanceType},name=${instance.instanceName} violates the application integrity` +
          ` due to the name not conforming with regex ${nameRegex.source}`
      )
    }
  }
}
