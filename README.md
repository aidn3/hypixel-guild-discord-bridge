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

## Documentation And Tutorials

- [Frequently asked questions](docs/FAQ.md)
- [All features available](docs/FEATURES.md)
- [Compatibility and future support](docs/COMPATIBILITY.md)
- [Migrating to newer version](docs/MIGRATION.md)
- [Tracking metrics via Prometheus](docs/PROMETHEUS.md)
- [How to create plugins](docs/PLUGIN-TUTORIAL.md)

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

## Installing and Running

### Prerequisites

- [Nodejs version 1.20 or later](https://nodejs.dev/download)
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

- Explore the project files and copy the contents of `config_example.yaml` into `config.yaml`
- Open `config.yaml` and fill in the information (Security: `config.yaml` contains sensitive information. Keep it safe!)
- In `config.yaml` fill out `general.hypixelApiKey` and `discord.key` and `discord.adminIds`
- (Optional) for **Advanced users only:** Edit other options in `config.yaml` to fine tune the bridge

### Install

Install dependencies and libraries by executing the command:

```shell
npm install
```

New directory `node_modules` will be generated containing all required files.

### Run

Start the service by executing command:

```shell
npm start
```

### Run Via Docker

Alternatively, Docker image is available to use at [GitHub Container Service](https://github.com/aidn3/hypixel-guild-discord-bridge/pkgs/container/hypixel-guild-discord-bridge).
Image is usually up to date.

To start, first prepare the configuration as instructed in [this section](#configure). Then execute:

```shell
sudo docker container run -it --rm -v ./config.yaml:/app/config.yaml ghcr.io/aidn3/hypixel-guild-discord-bridge:latest
```

Note that the path of the configuration source file must either be relative (with the `./`) or absolute.

Alternatively, providing the path as an argument to the docker container is also possible:

```shell
sudo docker container run -it --rm -v ./config.yaml:/config/config.yaml ghcr.io/aidn3/hypixel-guild-discord-bridge:latest /config/config.yaml
```

## Credits

- The Project is inspired by [hypixel-discord-chat-bridge by Senither](https://github.com/Senither/hypixel-discord-chat-bridge).
- [Soopyboo32](https://github.com/Soopyboo32) for providing [an awesome command API](https://soopy.dev/commands)
- Aura#5051 for in-game commands: Calculate, 8ball, IQ, Networth, Weight, Bitches
- All contributors whether by code, ideas/suggestions or testing
