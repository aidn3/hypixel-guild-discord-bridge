# Plugin Tutorial

## Getting Started

To start, create a file in the application root directory `example-plugin.ts`.  
Import the plugin interface and implement it as the default export in the file:

```typescript
import type { PluginInterface, PluginContext } from './src/common/plugins'

export default {
  onRun(context: PluginContext): void {
    context.logger.log('Plugin loaded!')
  }
} satisfies PluginInterface
```

Register the newly created plugin in the `config.yaml` file in `plugins` section:

```yaml
---
plugins:
  - './example-plugin.ts'
```

## Application API

Application provides both high level API and direct access to control and fine tune everything.

### High Level API

The high level API abstracts all different type of instances and simplifies the interactions making it easy to create
new behaviours such as new commands, new chat/event detection, etc.
The api is accessed via the `PluginContext` provided when the plugin function `onRun(...)` is called from the
application.

The entire high level API is event driven making it easy to work with. The event names and their interfaces are stored
in `./src/common/application-event`.

> Warning: All events are immutable objects. Forcefully modifying them will result in an undefined behaviour.
> The only way to change a behaviour is to use the Direct Access.

Example of a plugin that logs any chat message from anywhere:

```typescript
import type { PluginInterface, PluginContext } from './src/common/plugins'

export default {
  onRun(context: PluginContext): void {
    context.application.on('chat', (event) => {
      console.log(event.message)
    })
  }
} satisfies PluginInterface
```

Example of a plugin that reads raw Minecraft chat and replies back when a certain message is detected:

```typescript
import type { PluginContext, PluginInterface } from './src/common/plugins'

export default {
  onRun(context: PluginContext): void {
    context.application.on('minecraftChat', (event) => {
      if (event.message.includes('secret-word')) {
        context.application.clusterHelper.sendCommandToMinecraft(event.instanceName, 'secret response!')
      }
    })
  }
} satisfies PluginInterface
```

Example of a plugin that creates and sends a notification to officer chat when anyone joins the guild in-game:

```typescript
import type { PluginInterface, PluginContext } from './src/common/plugins'

export default {
  onRun(context: PluginContext): void {
    context.application.on('event', (event) => {
      // if a join event occours
      if (event.eventType === EventType.JOIN) {
        // send an event as a reply
        context.application.emit('event', {
          // always set to true. This helps when synchronizing a cluster of applications
          localEvent: true,

          // where the event is coming from. This helps other plugins and application components
          // when deciding how to deal with the event
          instanceType: InstanceType.PLUGIN,
          instanceName: context.pluginName,

          // How should it be handled by the application components
          severity: Severity.INFO,
          removeLater: false,
          channelType: ChannelType.OFFICER,

          // the info of the event
          eventType: EventType.AUTOMATED,
          username: event.username,
          message: `${event.username} has just joined!`
        })
      }
    })
  }
} satisfies PluginInterface
```

### Direct Access

This is used to modify the application behaviour by accessing the application internal objects on runtime.
It is done by accessing `PluginContext.localInstances`, which contains all internal running instances.

> Although it is officially provided by the application, it is not recommended at all
> since the plugin can break with any minor update that changes the internal code.
> The better solution would be to just clone the source code and modify it to the targeted behaviour instead.

Example of accessing minecraft internal bot clients:

```typescript
import type { PluginContext, PluginInterface } from './src/common/plugins'
import MinecraftInstance from './src/instance/minecraft/minecraft-instance'

export default {
  onRun(context: PluginContext): void {
    const minecraftInstances = context.localInstances.filter((instance) => instance instanceof MinecraftInstance)
    for (const minecraftInstance of minecraftInstances as MinecraftInstance[]) {
      context.logger.log(minecraftInstance.client?.session?.accessToken ?? 'not found')
    }
  }
} satisfies PluginInterface
```
