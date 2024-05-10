# hypixel-guild-discord-bridge

<p>
  <a href="https://github.com/plantain-00/type-coverage"><img alt="type-coverage" src="https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Faidn3%2Fhypixel-guild-discord-bridge%2Fmaster%2Fpackage.json"></a>
  <img alt="A badge displaying the number of messages being sent via the project" src="https://img.shields.io/badge/dynamic/json?label=Messages%20Sent&query=totalChatShort&url=https%3A%2F%2Faidn5.com%2Fstats.json">
  <a href="https://discord.gg/ej7tQHPF8y"><img src="https://img.shields.io/discord/1002575659694043206?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
</p>

## Introduction

A service that connects multiple Hypixel guilds and Discord servers together.
This project is made to be fully flexible and customisable, offering a high quality user experience while keeping it simple.

> **_DISCLAIMER_: This project interacts with Hypixel in an unintended way by simulating a minecraft client and by processing
> packets which might get you banned if over-abused too much.  
> Just like any other modification and service that interacts with Hypixel servers, this goes without saying: "Use at
> your own risk"**

## Migrating To 3.x.x

Breaking changes:

- `config.yaml` has been reformatted. Check the new `config_example.yaml` and compare it with the old config file.
- Version 3.x websocket is incompatible with older versions. You cannot connect the new version with the old one.
- Chat Commands have been moved to their own instance in `config.yaml`. Only enable one instance when using websocket.
- Project has been moved to ESM. Old plugins that still use commonjs will not work anymore.
- The Minecraft bot and websocket have been stripped down to bare metal. Any plugins that use those features must be updated accordingly.
- The punishment system has been revised and now uses `./configs/` to save its state as a file. The `./configs/` directory is now git-ignored.
- Any unexpected errors during the launching phase will result in a shutdown with an exit code instead of sending a notification.

## Table Of Contents

- [Features](#Features)
  - [Permissions](#Permissions)
  - [Supported Discord Commands](#supported-discord-commands)
  - [Supported Events](#supported-events)
  - [Supported Chat Commands](#supported-chat-commands)
  - [Available Plugins](#available-plugins)
  - [How to execute commands](#how-to-execute-commands)
- [Metrics](#metrics)
  - [Available Metrics](#available-metrics)
  - [Metrics Config](#metrics-config)
  - [Metrics With Grafana](#metrics-with-grafana)
- [Installing](#installing-and-running)
  - [Prerequisites](#Prerequisites)
  - [Download](#Download)
  - [Configure](#Configure)
  - [Install](#Install)
  - [Run](#Run)
- [Advanced](#advanced)
  - [Sockets And Cluster Nodes](#sockets-and-cluster-nodes)
  - [Node Modes](#node-modes)
  - [Setup Cluster](#setup-cluster)
- [Documentation and Tutorials](#documentation-and-tutorials)
- [Credits](#Credits)

## Features

- Connect multiple guilds chats together
- Bind hypixel guild chats to Discord channels
- Supports public, officer and private chat
- Supports in-game moderation commands from Discord
- Share events with Discord such as online/offline/join/leave/mute notification/etc
- Allows commands to be executed
- Logs all chats/events/etc
- Quality of life commands. For example, `/list` - lists online members and their current game mode
- Provides detailed metrics for every instance
- Supports custom plugins
- Supports proxies for Minecraft instances

### Permissions

| Name    | Description                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Anyone  | Anything that usually can be seen in-game guild chat<br> e.g. public chat, join/leave notification, etc            |
| Helper  | Anything that requires special permission to see in-game guild chat<br> e.g. officer chat, mute notification, etc. |
| Officer | Superset of **Helper** role. Given to trusted members                                                              |
| Admin   | Special permission that is used to administrate the service.<br> Note: Only ONE person can have this permission!   |

### Supported Discord Commands

| Command                             | Description                                             | Permission     |
| ----------------------------------- | ------------------------------------------------------- | -------------- |
| `/ping`                             | Show Discord response latency                           | Anyone         |
| `/list`                             | List all online members and their current game mode     | Anyone         |
| `/connectivity`                     | Send an echo to all Minecraft instances to check status | Anyone         |
| `/about`                            | Display basic info about the client                     | Anyone         |
| `/promote` & `/demote` & `/setrank` | Equivalent to `/guild promote/demote/setrank`           | Helper         |
| `/invite` & `/accept`               | Equivalent to `/guild invite/accept`                    | Helper         |
| `/reconnect`                        | Reconnect an in-game instance to Hypixel                | Helper         |
| `/punishments`                      | Equivalent to `/guild mute/unmute/kick`. Can also ban   | Helper/Officer |
| `/restart`                          | Restart the entire bridge service                       | Admin          |
| `/override`                         | Send direct commands to all minecraft clients           | Admin          |

### Supported Events

| **Event**      | **Description**                                                            | **Who can see it** |
| -------------- | -------------------------------------------------------------------------- | ------------------ |
| Online/Offline | Member logging on/off                                                      | Anyone             |
| Join/Leave     | Member joins/leaves the guild                                              | Anyone             |
| Promote/Demote | Member promoted/demoted in the guild                                       | Anyone             |
| Request        | Member requesting to join the guild                                        | Anyone             |
| Quest          | Guild quest milestone reached                                              | Anyone             |
| Repeat         | Warn about "can't repeat message" <br/>when writing from a Discord channel | Anyone             |
| Block          | Warn about a Discord user saying something that breaks Hypixel's rules     | Anyone             |
| Kick           | Notify when someone is kicked from the guild                               | Public             |
| Mute / Unmute  | Notify when someone gets muted in the guild                                | Helper             |

### Supported Chat Commands

These commands can be executed from any chat channel the bridge can see.
This includes guild/officer chat as well as private `/msg` and direct messaging channels.

| Command      | Description                                     | Permission |
| ------------ | ----------------------------------------------- | ---------- |
| !calculate   | Calculate a math expression: `!calculate 1+2*3` | Anyone     |
| !catacomb    | Get a player's catacombs and class level        | Anyone     |
| !8ball       | Replica of **8 ball**.`!8ball Will I win?`      | Anyone     |
| !darkauction | Show the remaining time till next dark auction  | Anyone     |
| !explain     | Explain what the bridge does and how it works   | Anyone     |
| !guild       | Give a summary of the guild of a given user     | Anyone     |
| !help        | Show a command usage `!help runs`               | Anyone     |
| !iq          | Give a random IQ number to the guild member     | Anyone     |
| !kuudra      | Get a player's kuudra completions `!kuudra hot` | Anyone     |
| !level       | Get a player's skyblock level                   | Anyone     |
| !networth    | Calculate the in-game networth of a player      | Anyone     |
| !rps         | Play rock paper scissors `!rps rock`            | Anyone     |
| !roulette    | Has a chance of muting a player                 | Anyone     |
| !runs        | Return a plauer's floor completions `!runs m7`  | Anyone     |
| !secrets     | Return a player's total dungeon secrets         | Anyone     |
| !skill       | Return player's skill level `!skill mining`     | Anyone     |
| !slayer      | Return a player's slayer stats `!slayer wolf`   | Anyone     |
| !toggle      | Enable/disable commands `!toggle 8ball`         | Anyone     |
| !weight      | Calculate the **Senither Weight** of a player   | Anyone     |
| !override    | Run a command directly `!overide /guild party`  | Admin      |

### Available Plugins

Application has an official public API and supports custom plugins to enhance potential.  
Loaded plugins can be configured in the `config.yaml` file when [configuring the app](#configure).  
To create custom plugins see [Documentation And Tutorials](#documentation-and-tutorials).

These are the supported official plugins that come bundled with the application:

| Plugin            | Description                                                                             | Importance      | Notice                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| auto-restart      | Schedule restarting every 24 hours                                                      | Essential       | A process monitor is required to restart the application after it shuts down. Not periodically restarting can lead to high RAM usage. |
| limbo-plugin      | Forces Minecraft client to stay in Hypixel limbo                                        | Essential       | Being outside of limbo for prolonged periods can lead to the account being banned. Only disable if required.                          |
| punishment-plugin | Enforces punishments and prevents punishment evasion                                    | Recommended     | Plugin will mute users but won't ban them, instead it will send a notification in officer chat.                                       |
| reaction-plugin   | Send a greeting/reaction message when a member joins/leaves or is kicked from the guild | Quality of Life | N/A                                                                                                                                   |
| dark-auction      | Send a reminder when a skyblock dark auction is starting                                | Quality of Life | Sends a reminder 5 minutes and 1 minute before the dark auction.                                                                      |
| starfall-cult     | Send a reminder when the skyblock starfall cult gathers                                 | Quality of Life | N/A                                                                                                                                   |

### How to execute commands (override)

**Note: Only the one person who has administrator permissions can execute commands!**  
From In-game: `/gc !override /guild party`  
From Discord: `/override /guild party`

---

## Metrics

hypixel-guild-discord-bridge supports [Prometheus](https://github.com/prometheus/prometheus) metrics, and it is
**enabled by default** on port `9095`.
Many metrics are automatically collected in memory and await prometheus to scrap them.

### Available Metrics

These are the currently monitored metrics. No usernames or anything personal is monitored. All metrics have the default
prefix `guild_bridge_`. It can be changed in `config.yaml` under `metrics`.

| Metric                        | Description                  | Source                                                  | metadata                                                                                                                                        |
| ----------------------------- | ---------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PREFIX_guild_exp_total`      | Guild total experience       | Hypixel API `/guild` end point                          | `name`: Guild name                                                                                                                              |
| `PREFIX_guild_exp_game`       | Guild experience per game    | Hypixel API `/guild` end point                          | `name`: Guild name, `type`: game type                                                                                                           |
| `PREFIX_guild_members`        | Guild members count          | Hypixel API `/guild` end point                          | `name`: Guild name                                                                                                                              |
| `PREFIX_chat`                 | Messages count of all chat   | In-game guild chat/Discord bot                          | `location`: Discord, webhook, in-game.<br>`scope`: private, officer, public chat.<br>`instance`: name of the source registered in `config.yaml` |
| `PREFIX_command`              | Commands usage count         | Discord commands interactions and in-game chat commands | Same as chat metrics + `command`: command name                                                                                                  |
| `PREFIX_event`                | Events count                 | Discord server events and in-game chat                  | same as chat metrics + `event`: event name (e.g. offline, join, mute, etc.)                                                                     |
| `PREFIX_guild_members_online` | Guild current online members | In-game periodic execution of `/guild list`             | `name`: Guild name                                                                                                                              |

### Metrics Config

In-game periodic command execution for metrics are **disabled by default**.
Automatically sending commands non-stop to Hypixel might get the client banned for blatant automation.
Although the chance is next to none, it is disabled for safe measures.

### Metrics With Grafana

Metrics can be directly used from the Prometheus server by querying it directly.
However, to visualise the data, another server is required to do the job.
[Grafana](https://grafana.com) is one of the most popular and easy to use out there.
Many tutorials exist on the internet showcasing Grafana setups and configs.

Here are examples of **Prometheus queries** and their results displayed using Grafana:

- Guild Chat:

```prometheus
sum(increase(guild_bridge_chat[1h])) by (scope,location)
```

![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_chat.png)

- Guild Total Experience:

```prometheus
increase(guild_bridge_guild_exp_total[10m])
```

![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_experience_total.png)

- Guild Current Online Members:

```
guild_bridge_guild_members_online
```

![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_members_online.png)

## Installing and Running

### Prerequisites

- [Nodejs version 1.18 or later](https://nodejs.dev/download)
- [npm](https://nodejs.org/en/download/) (usually installed by default with `Nodejs`)
- Minecraft alt account
- (Optional) [Git](https://git-scm.com/downloads)

### Download

Clone and download the complete project by using `Git` tool:

```shell
git clone https://github.com/aidn3/hypixel-guild-discord-bridge
```

Alternatively, [download the source code](https://github.com/aidn3/hypixel-guild-discord-bridge/archive/refs/heads/master.zip)
directly without any revisions. (Updating the service will be difficult)

### Configure

- Explore the project files and copy the contents of `.config_example.yaml` into `config.yaml`
- Open `config.yaml` and fill in the information (Security: `config.yaml` contains sensitive information. Keep it safe!)
- In `config.yaml` fill out `general.hypixelApiKey` and `discord` and `minecraft.instances`
- (Optional) for **Advanced users only:** Edit other options in `config.yaml` to fine tune the bridge

### Install

Install dependencies and libraries by executing the command:

```shell
npm install
```

New dictionary `node_modules` will be generated containing all required files.

### Run

Start the service by executing command:

```shell
npm start
```

---

## Advanced

This section is for advanced users who wish to run a bridge that supports thousands of online players with dozens of
connected guilds.

### Sockets And Cluster Nodes

Bridge supports cluster mode. That means, the bridge can be divided into smaller parts and be hosted on different servers
and all be connected via sockets.  
When to use cluster mode:

- If more than 2 Minecraft accounts are connected from same host server. Hypixel will IP ban all accounts for "
  compromised account" or "suspicious activity"
- If a Minecraft account owner wishes to hold the login details by hosting a part of the bridge on their server

### Node Modes

Each node supports two modes: `client` and `server`.
Only one server can exist and all clients will connect to it (Server must also not be behind a firewall).

- Server mode is just an extension of client mode. It supports instances as well as Discord bridge and minecraft bots
- Server's goal is to only forward all events and data and distribute it to all clients
- Server will not wait for client to reconnect when forwarding events. Clients however will wait to re-sync with server

### Setup Cluster

All configurations will be in `config.yaml` under `socket` section.

- Follow the [Setup](#installing-and-running) process for each node, but don't start them yet
- Set config `enabled` to true.
- Choose a secure password and set it under `key`. (Security: Anyone can hijack the bridge if it is easily guessable)
- Choose which node shall act as the "Server" and set it under config `type`
- Set the config `uri` to the server node socket to connect to
- Start all nodes

---

## Documentation And Tutorials

- [How to create plugins](./PLUGIN-TUTORIAL.md)

## Credits

- The Project is inspired
  by [hypixel-discord-chat-bridge by Senither](https://github.com/Senither/hypixel-discord-chat-bridge).
- Aura#5051 for in-game commands: Calculate, 8ball, IQ, Networth, Weight, Bitches
- All contributors whether by code, ideas/suggestions or testing
