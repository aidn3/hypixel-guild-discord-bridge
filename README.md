# hypixel-guild-discord-bridge
Service connects multiple guilds and discord server together
> **Disclaimer: This project interacts with hypixel in an unintended way by simulating a minecraft client and process packets which might gets you banned if you over-abuse it much.  
> Just like any other modification and service that interacts with Hypixel servers, this goes without saying: "Use at your own risk"**  

## Table Of Contents
- [Features](#Features)
  - [Permissions](#Permissions)
  - [Supported Discord Commands](#Supported Discord Commands)
  - [Supported Events](#Supported Events)
  - [Supported In-game Commands](#Supported Ingame Commands)
  - [How to execute commands](#How to execute commands)
- [Installing](#Installing and Running)
  - [Prerequisites](#Prerequisites)
  - [Download](#Download)
  - [Configure](#Configure)
  - [Install](#Install)
  - [Run](#Run)
- [Credits](#Credits)

## Features

- Connect multiple guilds chats together
- Bind hypixel guilds chats to discord channels
- Support Public and Officer Chat
- Support muting/kicking/inviting/etc. from discord
- Share events with discord such as online/offline/join/leave/mute notification/etc.
- Allow to execute commands
- Log all Chats/Events/etc
- Quality Of Life such as `/list` command listing online members and their current game-mode

### Permissions

| Name    | Description                                                                                                       | 
|---------|-------------------------------------------------------------------------------------------------------------------|
| Anyone  | Anything that usually can be seen in-game guild chat<br> e.g. Public Chat, Join/Leave Notification, etc           |   
| Officer | Anything that requires special permission to see in-game guild chat<br> e.g. Officer Chat, Mute notification, etc |    
| Admin   | Special Permission that is used to administrate the service.<br> Note: Only ONE person can have this permission!  |    

### Supported Discord Commands

| Command                | Description                                         | Permission |
|------------------------|-----------------------------------------------------|------------|
| `/ping`                | Show Discord response latency                       | Anyone     |
| `/list`                | List all online members and their current game-mode | Anyone     |
| `/promote` & `/demote` | Equivalent to `/guild promote/demote`               | Officer    |
| `/mute` & `/unmute`    | Equivalent to `/guild mute/unmute`                  | Officer    |
| `/kick` & `/invite`    | Equivalent to `/guild kick/invite`                  | Officer    |
| `/override`            | Send direct commands to all minecraft clients       | Admin      |

### Supported Events

| **Event**      | **Description**                                                          | **Who can see it** |
|----------------|--------------------------------------------------------------------------|--------------------|
| Online/Offline | Member logging in/off                                                    | Anyone             |
| Join/Leave     | Member joins/leaves the guild                                            | Anyone             |
| Repeat         | Warn about "can't repeat message" <br/>when writing from discord channel | Anyone             |
| Mute           | Notify when someone gets muted in the guild                              | Officer            |
| Kick           | Notify when someone is kicked from the guild                             | Officer            |

### Supported Ingame Commands

| Command  | Description                                      | Permission |
|----------|--------------------------------------------------|------------|
| /explain | Explain what is this client in public guild chat | Anyone     |
| /fact    | Give a random fun fact about the guild members   | Anyone     |

### How to execute commands

**Note: Only the one person who holds administrate permission can execute command!**  
From In-game: `/msg username /guild party`  
From Discord: `/override /guild party`

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
The Project is a duplicate of [hypixel-discord-chat-bridge by Senither](https://github.com/Senither/hypixel-discord-chat-bridge).   
This project is made to be fully flexible and customizable 
offering quality user experience while keeping it simple