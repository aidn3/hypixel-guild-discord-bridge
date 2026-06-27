# hypixel-guild-discord-bridge

<p>
  <a href="https://github.com/plantain-00/type-coverage"><img alt="type-coverage" src="https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Faidn3%2Fhypixel-guild-discord-bridge%2Fmaster%2Fpackage.json"></a>
  <img alt="A badge displaying the number of active instances" src="https://shm.aidn5.com/badge/hypixel-guild-discord-bridge/instances?label=Instances">
  <img alt="A badge displaying the number of total messages that have been processed via this project" src="https://shm.aidn5.com/badge/hypixel-guild-discord-bridge/metric/totalMessages?label=Total%20messages">
  <a href="https://discord.gg/ej7tQHPF8y"><img src="https://img.shields.io/discord/1002575659694043206?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
</p>
  
## Introduction

A two-way chat bridge between Hypixel guilds and Discord channels.  
This project is made with the philosophy to be fully user-oriented giving users full control with a simple yet an eye-candy UI.

> **_DISCLAIMER_: This project interacts with Hypixel in an unintended way by simulating a minecraft client and by processing
> packets which might get you banned if over-abused.  
> Just like any other modification and service that interacts with Hypixel servers, this goes without saying: "Use at
> your own risk"**

## Documentation And Tutorials

- [How to install and run](docs/INSTALL.md)
- [Frequently asked questions](docs/FAQ.md)
- [Permissions required to function](./docs/PERMISSIONS.md)
- [All Commands And Interactions](docs/COMMANDS.md)
- [Compatibility and future support](docs/COMPATIBILITY.md)
- [Migrating to newer version](docs/MIGRATION.md)
- [Tracking metrics via Prometheus](docs/PROMETHEUS.md)
- [Security Policy](SECURITY.md)
- [Privacy Notice](docs/PRIVACY.md)
- [How to create plugins](docs/PLUGIN-TUTORIAL.md)
- [Contribute](CONTRIBUTING.md)
- [Development Documentation](./docs/DEVELOPMENT.md)

## Features

- Bridge multiple guilds chats and Discord channels
- Supports public, officer and private chat in-game
- Supports in-game moderation commands from Discord
- Fully synchronize in-game chat and interactions with Discord including guild events such as
  online/offline/join/leave/mute notification/etc
- Support many commands from fun ones to management ones
- Logs all chats/events/etc as records for staff to view
- Provides detailed metrics per user and per guild (by Prometheus or by leaderboard)
- Supports custom plugins with fully fleshed out public API
- Supports proxies for Minecraft instances
- Auto guild ranks and Discord roles sync with custom conditions
- Automated management and moderation tools such as punishments, join waitlist

## Showcase

**Control all the settings from fancy yet simple interface.**  
**No more editing complicated configuration files or waiting for the hosting provider to do it for you.**  
<img src="docs/assets/showcase-settings.gif" width="500">

**Automate your guild's management, from waitlist to automated in-game rank syncing**  
<img src="docs/assets/showcase-waitlist.gif" width="400">

**Over 100+ quality-of-life chat commands spanning from stats commands to fun and games ones:**  
<img src="docs/assets/showcase-commands-response.png" width="400">
<img src="docs/assets/showcase-commands-rendering.png" width="400">

**Feel at home with the support of all popular chat types (webhook, embed, minecraft render style)**  
<img src="docs/assets/showcase-chat-webhook.png" width="400">
<img src="docs/assets/showcase-chat-render.png" width="400">
<img src="docs/assets/showcase-chat-embed.png" width="400">

**Keep track of your guild via metrics and leaderboards**  
<img src="docs/assets/showcase-leaderboards.png" width="400">

**Manage the guild from anywhere and keep track of everything like never before**  
<img src="docs/assets/showcase-punishments.png" width="400">
<img src="docs/assets/showcase-ingame-commands.png" width="400">

## Install and run

[Read and follow this guide](docs/INSTALL.md) to start.

## Privacy Notice

Aggregated anonymous data are collected to be displayed here on the main page,
such as how many total instances of this project is being hosted by everyone.

For further information, check [Privacy Notice](docs/PRIVACY.md).

## Credits

- The Project is inspired by [hypixel-discord-chat-bridge by Senither](https://github.com/Senither/hypixel-discord-chat-bridge).
- [Soopyboo32](https://github.com/Soopyboo32) for providing [an awesome command API](https://soopy.dev/commands)
- Aura#5051 for in-game commands: Calculate, 8ball, IQ, Networth, Weight, Bitches
- [WildWolfsblut](https://github.com/WildWolfsblut) for helping with various designs and structures
- [SkyCryptWebsite](https://github.com/SkyCryptWebsite) for providing [Senither weight](https://github.com/SkyCryptWebsite/SkyCrypt/blob/e2f421dec3a8afdd4830a26d206ec439e933266f/src/constants/weight/senither-weight.js)
- [Elite Skyblock](https://api.eliteskyblock.com) for providing the farming weight API
- [SHM](https://github.com/kOlapsis/shm) for providing a selfhost-able metrics server
- All contributors whether by code, ideas/suggestions or testing
