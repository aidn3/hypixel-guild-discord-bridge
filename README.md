# hypixel-guild-discord-bridge
Service connects multiple guilds and discord server together  
This project is made to be fully flexible and customizable
offering quality user experience while keeping it simple
> **Disclaimer: This project interacts with hypixel in an unintended way by simulating a minecraft client and process packets which might gets you banned if you over-abuse it much.  
> Just like any other modification and service that interacts with Hypixel servers, this goes without saying: "Use at your own risk"**  

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
- [Credits](#Credits)

## Features

- Connect multiple guilds chats together
- Bind hypixel guilds chats to discord channels
- Send and receive Chat from other guilds/discord servers via Webhooks
- Support Public and Officer Chat
- Support in-game moderation commands from discord
- Share events with discord such as online/offline/join/leave/mute notification/etc.
- Allow to execute commands
- Log all Chats/Events/etc
- Quality Of Life such as `/list` command listing online members and their current game-mode
- Provide a detailed metrics for every instance

### Permissions

| Name    | Description                                                                                                       | 
|---------|-------------------------------------------------------------------------------------------------------------------|
| Anyone  | Anything that usually can be seen in-game guild chat<br> e.g. Public Chat, Join/Leave Notification, etc           |   
| Officer | Anything that requires special permission to see in-game guild chat<br> e.g. Officer Chat, Mute notification, etc |    
| Admin   | Special Permission that is used to administrate the service.<br> Note: Only ONE person can have this permission!  |    

### Supported Discord Commands

| Command                             | Description                                         | Permission |
|-------------------------------------|-----------------------------------------------------|------------|
| `/ping`                             | Show Discord response latency                       | Anyone     |
| `/list`                             | List all online members and their current game-mode | Anyone     |
| `/about`                            | Display basic info about the client                 | Anyone     |
| `/bin`                              | Search lowest bin of an item                        | Anyone     |
| `/promote` & `/demote` & `/setrank` | Equivalent to `/guild promote/demote/setrank`       | Officer    |
| `/mute` & `/unmute`                 | Equivalent to `/guild mute/unmute`                  | Officer    |
| `/kick` & `/invite` & `/accept`     | Equivalent to `/guild kick/invite/accept`           | Officer    |
| `/restart`                          | Restart an in-game instance                         | Officer    |
| `/override`                         | Send direct commands to all minecraft clients       | Admin      |

### Supported Events

| **Event**      | **Description**                                                          | **Who can see it** |
|----------------|--------------------------------------------------------------------------|--------------------|
| Online/Offline | Member logging in/off                                                    | Anyone             |
| Join/Leave     | Member joins/leaves the guild                                            | Anyone             |
| Request        | Member requesting to join the guild                                      | Anyone             |
| Repeat         | Warn about "can't repeat message" <br/>when writing from discord channel | Anyone             |
| Block          | Warn about discord user saying something that breaks Hypixel rules       | Anyone             |
| Kick           | Notify when someone is kicked from the guild                             | Public             |
| Mute / Unmute  | Notify when someone gets muted in the guild                              | Officer            |


### Supported Ingame Commands

| Command    | Description                                      | Permission |
|------------|--------------------------------------------------|------------|
| !explain   | Explain what is this client in public guild chat | Anyone     |
| !fact      | Give a random fun fact about the guild members   | Anyone     |
| !calculate | calculate a math expression: `!calculate 1+2*3`  | Anyone     |
| !8ball     | replica of **8 ball**.`!8ball Will I win?`       | Anyone     |
| !iq        | Give a random iq number to the guild member      | Anyone     |
| !weight    | calculate **Senither Weights** of players        | Anyone     |
| !networth  | Calculate the in-game networth of players        | Anyone     |
| !guild     | Give a summary of the guild for a given user     | Anyone     |
| !bitches   | Give a random number to the guild member         | Anyone     |


### How to execute commands

**Note: Only the one person who holds administrate permission can execute command!**  
From In-game: `/msg username /guild party`  
From Discord: `/override /guild party`


## Webhook
"Webhooks can send messages to a text channel without having to log in as a bot."  
It is used if the targeted community isn't within the admins' jurisdiction.  
Used to avoid giving any account login information (e.g. password, tokens, etc) or running the cluster in one server.

### Receive Messages
To receive messages, you need to 
- Create a **Discord webhook** in the used **guild public chat channel**
- Register the **webhook id** in `.env` (messages will be filtered otherwise)
- Give the FULL **webhook id** to the targeted community to send messages through

### Send Messages
- Receive the **full webhook url**
- Register it in `.env` (messages won't be sent over otherwise)

### Webhook Best Practice
It is best to exchange both send and receive keys and set up a two-way road for both community.  
`.env` Supports name for each community. You can for example exchange both keys and name the connection "Simple".
`WEBHOOK_simple="receive-id-here,send-url-here"`

## Metrics
hypixel-guild-discord-bridge supports [Prometheus](https://github.com/prometheus/prometheus) metrics, and it is **enabled by default** on port `9095`. 
Many metrics are automatically collected in memory and await prometheus to scrap them.

### Available Metrics
These are the currently monitored metrics. No usernames or anything personal is monitored. All metrics have the default prefix `guild_bridge_`. It can be changed in `./config/metrics-config.json`.

| Metric                        | Description                  | Source                                                  | metadata                                                                                                                                 |
|-------------------------------|------------------------------|---------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `PREFIX_guild_exp_total`      | Guild total experience       | Hypixel API `/guild` end point                          | `name`: Guild name                                                                                                                       |
| `PREFIX_guild_exp_game`       | Guild experience per game    | Hypixel API `/guild` end point                          | `name`: Guild name, `type`: game type                                                                                                    |
| `PREFIX_guild_members`        | Guild members count          | Hypixel API `/guild` end point                          | `name`: Guild name                                                                                                                       |
| `PREFIX_chat`                 | Messages count of all Chat   | In-game guild chat/discord bot                          | `location`: discord, webhook, in-game.<br>`scope`: private, officer, public chat.<br>`instance`: name of the source registered in `.env` |
| `PREFIX_command`              | Commands usage count         | Discord commands interactions and in-game chat commands | Same as chat metrics + `command`: command name                                                                                           |
| `PREFIX_event`                | Events count                 | Discord server events and in-game chat                  | same as chat metrics + `event`: event name (e.g. offline, join, mute, etc.)                                                              |
| `PREFIX_guild_members_online` | Guild current online members | In-game interval execution of `/guild list`             | `name`: Guild name                                                                                                                       |

### Metrics Config
All metrics config are in `./config/metrics-config.json`.  

In-game interval commands execution for metrics is **disabled by default**. 
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
![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_members_online.png)


# Installing and Running
## Prerequisites
- [Nodejs version 1.16 or later](https://nodejs.dev/download)
- [npm](https://nodejs.org/en/download/) (usually installed by default with `Nodejs`)
- Minecraft Alt Account
- (Optional) [Git](https://git-scm.com/downloads)

## Download
Clone and download the complete project by using `Git` tool:
```shell
git clone https://github.com/aidn3/hypixel-guild-discord-bridge
```
Alternatively, [download the source code](https://github.com/aidn3/hypixel-guild-discord-bridge/archive/refs/heads/master.zip) 
directly without any revisions. (Updating the service will be difficult) 

## Configure
- Explore the project files and duplicate `.env_example` file into `.env`
- Open `.env` and fill the information (Security: `.env` file is like password. Keep it safe!)
- (Optional) for **Advanced users only:** Navigate into `./config/` dictionary for all configurations

## Install
Install dependencies and libraries by executing the command:
```shell
npm install clean
```
New dictionary `node_modules` will be generated containing all required files.

## Run
Start the service by executing command:
```shell
npm start
```

## Credits
- The Project is a duplicate of [hypixel-discord-chat-bridge by Senither](https://github.com/Senither/hypixel-discord-chat-bridge).
- Aura#5051 for in-game commands: Calculate, 8ball, IQ, Networth, Weight, Bitches