import type Application from '../application.js'
import { InstanceEventType, InstanceType, type MinecraftRawChatEvent } from '../common/application-event.js'
import { Status } from '../common/client-instance.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'
import type { ChatCommandContext } from '../instance/commands/common/command-interface.js'
import { ChatCommandHandler } from '../instance/commands/common/command-interface.js'
import MinecraftInstance from '../instance/minecraft/minecraft-instance.js'
import { sleep } from '../util/shared-util.js'

let disableLimboTrapping = false

/* NOTICE
THIS IS AN OPTIONAL PLUGIN. TO DISABLE IT, REMOVE THE PATH FROM 'config.yaml' PLUGINS.
THIS PLUGIN IS INCOMPATIBLE WITH `limbo-plugin`. DISABLE ONE BEFORE ENABLING THE OTHER ONE.
*/
export default {
  onRun(context: PluginContext): void {
    const minecraftInstances = context.localInstances.filter((instance) => instance instanceof MinecraftInstance)

    if (context.addChatCommand) context.addChatCommand(new WarpCommand(minecraftInstances))

    context.application.on('instanceStatus', (event) => {
      if (event.status === InstanceEventType.Created && event.instanceType === InstanceType.Minecraft) {
        const localInstance = context.localInstances.find(
          (instance) => instance instanceof MinecraftInstance && instance.instanceName === event.instanceName
        )
        if (localInstance != undefined) {
          const clientInstance = localInstance as MinecraftInstance
          // "login" packet is also first spawn packet containing world metadata
          clientInstance.clientSession?.client.on('login', async () => {
            if (!disableLimboTrapping) await limbo(clientInstance)
          })
          clientInstance.clientSession?.client.on('respawn', async () => {
            if (!disableLimboTrapping) await limbo(clientInstance)
          })
        }
      }
    })
  }
} satisfies PluginInterface

async function limbo(clientInstance: MinecraftInstance): Promise<void> {
  clientInstance.logger.debug('Spawn event triggered. sending to limbo...')
  await clientInstance.send('§')
}

async function warpPlayer(app: Application, minecraftInstanceName: string, username: string): Promise<string> {
  disableLimboTrapping = true

  // exit limbo and go to main lobby. Can't warp from limbo
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/lobby')

  // Go to Skyblock first before warping.
  // Person can rejoin if warped to the main lobby
  await sleep(2000)
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/skyblock')

  // ensure the account is in the hub and not on private island
  // to prevent being banned for "profile boosting"
  await sleep(12_000) // need higher cooldown to change between lobbies
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/hub')

  await sleep(2000)

  const errorMessage = await awaitPartyStatus(app, minecraftInstanceName, username)
  if (errorMessage != undefined) {
    disableLimboTrapping = false
    app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '§')

    app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/party disband')
    app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/party leave')

    return errorMessage
  }

  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/party warp')
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, `/pc Blame the gods on your luck`)
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/party disband')
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '/party leave')

  disableLimboTrapping = false
  app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, '§')

  return 'Player has been warped out!'
}

/**
 * Send party invite and await response.
 * The return is only a failure message. undefined means the invite was successful.
 *
 * @param app the application instance
 * @param minecraftInstanceName the target minecraft instance to use to execute commands
 * @param username the target to party
 */
async function awaitPartyStatus(
  app: Application,
  minecraftInstanceName: string,
  username: string
): Promise<string | undefined> {
  return await new Promise((resolve) => {
    let errorMessage: string | undefined

    const timeoutId = setTimeout(() => {
      app.removeListener('minecraftChat', chatListener)
      resolve("Player didn't accept the invite.")
    }, 30_000)

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.instanceName !== minecraftInstanceName) return
      let doneCollecting = false

      if (event.message.startsWith("You cannot invite that player since they're not online.")) {
        errorMessage = 'Player not online?'
        doneCollecting = true
      } else if (event.message.startsWith('You cannot invite that player.')) {
        errorMessage = 'Player has party invites disabled.'
        doneCollecting = true
      } else if (/^The party invite to (?:\[[+A-Z]{3,10}] )?(\w{3,32}) has expired/.exec(event.message) != undefined) {
        errorMessage = "Player didn't accept the invite."
        doneCollecting = true
      } else if (/^(?:\[[+A-Z]{3,10}] )?(\w{3,32}) joined the party/.exec(event.message) != undefined) {
        errorMessage = undefined
        doneCollecting = true
      }

      if (doneCollecting) {
        clearTimeout(timeoutId)
        app.removeListener('minecraftChat', chatListener)
        resolve(errorMessage)
      }
    }

    app.on('minecraftChat', chatListener)
    app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, `/party invite ${username}`)
    app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, `/party disband`)
    app.clusterHelper.sendCommandToMinecraft(minecraftInstanceName, `/party invite ${username}`)
  })
}

class WarpCommand extends ChatCommandHandler {
  private static readonly CommandCoolDown = 60_000
  private lastCommandExecutionAt = 0
  private readonly minecraftInstances: MinecraftInstance[]

  constructor(minecraftInstances: MinecraftInstance[]) {
    super({
      name: 'Warp',
      triggers: ['warp'],
      description: 'Warp a player out of a lobby',
      example: `warp Steve`
    })

    this.minecraftInstances = minecraftInstances
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.args.length === 0) {
      return this.getExample(context.commandPrefix)
    }

    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + WarpCommand.CommandCoolDown > currentTime) {
      return `Can use command again in ${Math.floor((this.lastCommandExecutionAt + WarpCommand.CommandCoolDown - currentTime) / 1000)} seconds.`
    }

    const username = context.args[0]
    const minecraftInstanceName =
      context.instanceType === InstanceType.Minecraft ? context.instanceName : this.getActiveMinecraftInstanceName()
    if (minecraftInstanceName === undefined) {
      return `No active connected Minecraft account exists to use`
    }

    this.lastCommandExecutionAt = currentTime

    context.sendFeedback(`Attempting to warp ${username}`)
    return await warpPlayer(context.app, minecraftInstanceName, username)
  }

  private getActiveMinecraftInstanceName(): string | undefined {
    return this.minecraftInstances.find((instance) => instance.status === Status.Connected)?.instanceName
  }
}
