# Plugin Tutorial

## Getting Started

To start, create a file in the application root directory `example-plugin.ts`.  
Import the plugin interface and implement it as **the default export** in the file:

```typescript
import PluginInstance from './src/common/plugin-instance.js'

export default class ExamplePlugin extends PluginInstance {
  onReady(): Promise<void> | void {
    this.logger.info('hello world')
  }
}
```

Register the newly created plugin in the `config.yaml` file in `plugins` section:

```yaml
---
plugins:
  - './example-plugin.ts'
```

## Example Usage

The application provides a high level API that abstracts all different type of instances and simplifies the interactions
making it easy to create new behaviours such as new commands, new chat/event detection, etc.
The API is accessed via the `this` when the plugin function `onReady()` is called from the
application.

The entire API is event-driven making it easy to work with. The event names and their interfaces are stored
in `./src/common/application-event.ts`.

Example of a plugin that logs any chat message from anywhere:

```typescript
import PluginInstance from './src/common/plugin-instance.js'

export default class ExamplePlugin extends PluginInstance {
  onReady(): Promise<void> | void {
    this.application.on('chat', (event) => {
      this.logger.log(event.message)
    })
  }
}
```

Example of a plugin that reads raw Minecraft chat and replies back when a certain message is detected:

```typescript
import { MinecraftSendChatPriority } from './src/common/application-event.js'
import PluginInstance from './src/common/plugin-instance.js'

export default class ExamplePlugin extends PluginInstance {
  onReady(): Promise<void> | void {
    this.application.on('minecraftChat', (event) => {
      if (event.message.includes('secret-word')) {
        this.application.emit('minecraftSend', {
          ...this.eventHelper.fillBaseEvent(),
          targetInstanceName: [event.instanceName],
          priority: MinecraftSendChatPriority.Default,
          command: 'secret response!'
        })
      }
    })
  }
}
```

Example of a plugin that creates and sends a notification to officer chat when anyone joins the guild in-game:

```typescript
import { ChannelType, Color, GuildPlayerEventType } from './src/common/application-event.js'
import PluginInstance from './src/common/plugin-instance.js'

export default class ExamplePlugin extends PluginInstance {
  onReady(): Promise<void> | void {
    this.application.on('guildPlayer', (event) => {
      if (event.type === GuildPlayerEventType.Join) {
        this.application.emit('broadcast', {
          // autofill mundane metadata like where the event is coming from, etc.
          // This helps other plugins and application components
          // when deciding how to deal with the event
          ...this.eventHelper.fillBaseEvent(),

          // How should it be handled by the application components
          color: Color.Info,
          channels: [ChannelType.Officer],

          // the info of the event
          username: event.username,
          message: `${event.username} has just joined!`
        })
      }
    })
  }
}
```

## Things To Lookout For

Plugins have the same level of access as any other internal `Instance` object. It is powerful, but also has many limitations and pitfalls.
Doing something not the way it is intended can lead to undefined behaviour. That means undetectable bugs and other problems such as desync can occur. This is an incomperhinsible list of things to lookout for:

- API docs is mainly stored in `./src/common/`.
- API is defined in `./src/common/**` (recursively) and in `./src/*` (NOT recursively). Plugins can only access these paths freely.
- Do NOT access or modify anything related to the application prior to calling this `onReady()` by using `constructor()` or other methods.
- All events are immutable objects. Forcefully modifying them will result in an undefined behaviour.

## Changing Existing Code

It is possible to modify existing code via javascript `prototype` or by accessing and modifying `private readonly` variables.
Some official plugins such as `./src/plugins/limbo-plugin.ts` actively use it too.
However, although it is officially used by the application in officially maintained plugins, it is not recommended at all
since the plugin can break with any PATCH version update that changes the internal code.

The better solution would be to just clone the source code and modify it to the targeted behaviour instead.
All officially created plugins in `./src/plugins/` will always work even if they access the internal code directly.

## Future Compatibility

See [Compatibility](./COMPATIBILITY.md) for more info.
