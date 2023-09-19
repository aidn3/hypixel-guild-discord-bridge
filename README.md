# hypixel-guild-discord-bridge

<p>
  <img src="https://img.shields.io/badge/dynamic/json?label=Messages%20Sent&query=totalChatShort&url=https%3A%2F%2Faidn5.com%2Fstats.json">
  <a href="https://discord.gg/ej7tQHPF8y"><img src="https://img.shields.io/discord/1002575659694043206?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
</p>
Service connects multiple guilds and discord server together  
This project is made to be fully flexible and customizable
offering quality user experience while keeping it simple

> **Disclaimer: This project interacts with Hypixel in an unintended way by simulating a minecraft client and processes
> packets which might get you banned if you over-abuse it too much.  
> Just like any other modification and service that interacts with Hypixel servers, this goes without saying: "Use at
> your own risk"**

## Table Of Contents

- [Features](#Features)
  - [Permissions](#Permissions)
  - [Supported Discord Commands](#supported-discord-commands)
  - [Supported Events](#supported-events)
  - [Supported In-game Commands](#supported-ingame-commands)
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
- [Credits](#Credits)

## Features

- Connect multiple guilds chats together
- Bind hypixel guilds chats to discord channels
- Send and receive Chat from other guilds/discord servers via Webhooks
- Supports Public and Officer Chat
- Supports in-game moderation commands from discord
- Share events with discord such as online/offline/join/leave/mute notification/etc.
- Allows executing commands
- Logs all Chats/Events/etc
- Quality Of Life such as `/list` command listing online members and their current game-mode
- Provides a detailed metrics for every instance
- Supports custom plugins
- Supports Proxies for Minecraft instances

### Permissions

| Name    | Description                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Anyone  | Anything that usually can be seen in-game guild chat<br> e.g. Public Chat, Join/Leave Notification, etc            |
| Helper  | Anything that requires special permission to see in-game guild chat<br> e.g. Officer Chat, Mute notification, etc. |
| Officer | Superset of **Helper** role. Given to trusted members                                                              |
| Admin   | Special Permission that is used to administrate the service.<br> Note: Only ONE person can have this permission!   |

### Supported Discord Commands

| Command                             | Description                                         | Permission |
| ----------------------------------- | --------------------------------------------------- | ---------- |
| `/ping`                             | Show Discord response latency                       | Anyone     |
| `/list`                             | List all online members and their current game-mode | Anyone     |
| `/about`                            | Display basic info about the client                 | Anyone     |
| `/promote` & `/demote` & `/setrank` | Equivalent to `/guild promote/demote/setrank`       | Helper     |
| `/mute` & `/unmute`                 | Equivalent to `/guild mute/unmute`                  | Helper     |
| `/invite` & `/accept`               | Equivalent to `/guild invite/accept`                | Helper     |
| `/restart`                          | Restart an in-game instance                         | Helper     |
| `/kick`                             | Equivalent to `/guild kick`                         | Officer    |
| `/override`                         | Send direct commands to all minecraft clients       | Admin      |

### Supported Events

| **Event**      | **Description**                                                          | **Who can see it** |
| -------------- | ------------------------------------------------------------------------ | ------------------ |
| Online/Offline | Member logging in/off                                                    | Anyone             |
| Join/Leave     | Member joins/leaves the guild                                            | Anyone             |
| Request        | Member requesting to join the guild                                      | Anyone             |
| Repeat         | Warn about "can't repeat message" <br/>when writing from discord channel | Anyone             |
| Block          | Warn about discord user saying something that breaks Hypixel rules       | Anyone             |
| Kick           | Notify when someone is kicked from the guild                             | Public             |
| Mute / Unmute  | Notify when someone gets muted in the guild                              | Helper             |

### Supported Ingame Commands

| Command    | Description                                     | Permission |
| ---------- | ----------------------------------------------- | ---------- |
| !explain   | Explain what the bridge does and how it works   | Anyone     |
| !fact      | Give a random fun fact about the guild members  | Anyone     |
| !calculate | Calculate a math expression: `!calculate 1+2*3` | Anyone     |
| !8ball     | Replica of **8 ball**.`!8ball Will I win?`      | Anyone     |
| !iq        | Give a random IQ number to the guild member     | Anyone     |
| !weight    | Calculate **Senither Weights** of players       | Anyone     |
| !networth  | Calculate the in-game networth of players       | Anyone     |
| !guild     | Give a summary of the guild for a given user    | Anyone     |
| !bitches   | Give a random number to the guild member        | Anyone     |
| !roulette  | Has a 1 in 6 chance of muting a member          | Anyone     |
| !rps       | Play rock paper scissors `!rps rock`            | Anyone     |

### How to execute commands

**Note: Only the one person who holds administrator permission can execute command!**  
From In-game: `/msg username /guild party`  
From Discord: `/override /guild party`

---

## Webhook

"Webhooks can send messages to a text channel without having to log in as a bot."  
It is used if the targeted community isn't within the admins' jurisdiction.  
Used to avoid giving any account login information (e.g. password, tokens, etc.) or running the cluster in one server.

### Receive Messages

To receive messages, you need to

- Create a **Discord webhook** in the used **guild public chat channel**
- Register the **webhook id** in `config.yaml` (messages will be filtered otherwise)
- Give the FULL **webhook id** to the targeted community to send messages through

### Send Messages

- Receive the **full webhook url**
- Register it in `config.yaml` (messages won't be sent over otherwise)

### Webhook Best Practice

It is best to exchange both send and receive keys and set up a two-way road for both community.  
`config.yaml` Supports name for each community.

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
| `PREFIX_chat`                 | Messages count of all Chat   | In-game guild chat/discord bot                          | `location`: discord, webhook, in-game.<br>`scope`: private, officer, public chat.<br>`instance`: name of the source registered in `config.yaml` |
| `PREFIX_command`              | Commands usage count         | Discord commands interactions and in-game chat commands | Same as chat metrics + `command`: command name                                                                                                  |
| `PREFIX_event`                | Events count                 | Discord server events and in-game chat                  | same as chat metrics + `event`: event name (e.g. offline, join, mute, etc.)                                                                     |
| `PREFIX_guild_members_online` | Guild current online members | In-game interval execution of `/guild list`             | `name`: Guild name                                                                                                                              |

### Metrics Config

All metrics config are in `./config/metrics-config.json`.

In-game interval commands execution for metrics are **disabled by default**.
Automatically sending commands non-stop to Hypixel might get the client banned for "botting".
Although the chance is next to non-existent, it is disabled for safe measures.

### Metrics With Grafana

Metrics can directly be used from Prometheus server by querying directly.
However, to visualise the data, another server is required to do the job.
[Grafana](https://grafana.com) is one of the most popular and easy to use out there.
Many tutorials exist on the internet showcasing Grafana setups and settings.

Here are examples of **Prometheus query** and their results displayed using Grafana:

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

## ![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_members_online.png)

## Installing and Running

### Prerequisites

- [Nodejs version 1.16 or later](https://nodejs.dev/download)
- [npm](https://nodejs.org/en/download/) (usually installed by default with `Nodejs`)
- Minecraft Alt Account
- (Optional) [Git](https://git-scm.com/downloads)

### Download

Clone and download the complete project by using `Git` tool:

```shell
git clone https://github.com/aidn3/hypixel-guild-discord-bridge
```

Alternatively, [download the source code](https://github.com/aidn3/hypixel-guild-discord-bridge/archive/refs/heads/master.zip)
directly without any revisions. (Updating the service will be difficult)

### Configure

- Explore the project files and duplicate `.config_example.yaml` file into `config.yaml`
- Open `config.yaml` and fill the information (Security: `config.yaml` file is like a password. Keep it safe!)
- In `config.yaml` fill out `general/hypixelApiKey` and `discord` and `minecraft/instances`
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

Bridge supports cluster mode. That means, bridge can be divided into smaller parts and be hosted on different servers
and all be connected together via sockets.  
When to use cluster mode:

- If more than 2 Minecraft accounts are connected from same host server. Hypixel will IP "nuke" ban all accounts for "
  compromised account"
- If a Minecraft account owner wishes to hold the login details by hosting a part of the bridge on their server

### Node Modes

Each node supports two modes: `client` and `server`.
Only one Server can exist and all Clients will connect to it (Server must also not be behind a firewall).

- Server mode is just an extension of Client mode. It supports instances as well as discord bridge and minecraft bots
- Server's goal is to only forward all events and data and distribute it to all clients
- Server will not wait for client to reconnect when forwarding events. Clients however will wait to re-sync with server

### Setup Cluster

All configurations will be in `config.yaml` under `socket` section.

- Follow [Setup](#installing-and-running) process for each node, but don't start them yet
- set config `enabled` to true.
- Choose a secure password in config and set it under `key`. (Security: Anyone can hijack the bridge if not set to a
  secure one)
- Choose which node to become the "Server" and set it under config `type`
- Name each node under config `instanceName` (Warning: Duplicate names might result in race condition or other odd
  behaviors)
- Set the config `uri` to the server node socket to connect to
- Start all nodes

---

## Credits

- The Project is a duplicate
  of [hypixel-discord-chat-bridge by Senither](https://github.com/Senither/hypixel-discord-chat-bridge).
- Aura#5051 for in-game commands: Calculate, 8ball, IQ, Networth, Weight, Bitches
