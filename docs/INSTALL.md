# Install and Run

<!-- TOC -->

- [Install and Run](#install-and-run)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Download and run](#download-and-run)
    - [Windows Double-Click](#windows-double-click)
    - [from the source code](#from-the-source-code)
    - [as a container](#as-a-container)
  - [Setup Via Discord](#setup-via-discord)
  <!-- TOC -->

## Prerequisites

- Minecraft alt account ready to be used
- [Discord bot created](https://discord.com/developers/applications) and added to a Discord server

## Setup

Make sure to grant permission to the application in various places to ensure its full functionality.
e.g. in-game for the Minecraft account and on a Discord server for the Discord bot.  
Check [this document](PERMISSIONS.md) for a comprehensive list of all the permissions needed for the application.

## Download and run

There are three official ways to run the application:

- [Windows Double-Click](#windows-double-click) (recommended for beginner users)
- [From the source code](#from-the-source-code)
- [As a container](#as-a-container)

### Windows Double-Click

For users who wish to run the application without installing or fine-tuning anything,
download [this script](../setup-and-start.bat) in **an empty folder** and double click it.  
The script will download everything, create configuration files, and run the application.  
After the application started, follow the [final steps](#setup-via-discord) to finalize the application.  
Nothing else is needed from this guide.

### from the source code

Make sure these applications are installed:

- [Node.js version 22 or later](https://nodejs.dev/download) installed
- [npm](https://nodejs.org/en/download/) installed (usually installed by default with `Node.js`)
- [git](https://git-scm.com/downloads) installed

Clone and download the complete project by using `git` tool:

```shell
git clone https://github.com/aidn3/hypixel-guild-discord-bridge
```

A directory will be created containing all the project files.

Open a terminal inside the newly created directory and execute this command to create the configuration file:

```shell
npm install && npm run setup
```

Follow the instruction in the terminal till a new `config.yaml` file is created inside the directory.

If you are running the application on Windows operating system, use this command in the terminal:

```shell
npm start
```

If you are on linux, execute this command to auto download all the libraries and start the application.
It will also keep the application up to date:

```shell
./start.sh
```

### as a container

Alternatively, Docker image is available to use at [GitHub Container Service](https://github.com/aidn3/hypixel-guild-discord-bridge/pkgs/container/hypixel-guild-discord-bridge).
Image is usually up to date.

To start, first prepare the configuration file:

- Download and rename [this file](../config_example.yaml) to `config.yaml`
- Open `config.yaml` and fill in the information (Security: `config.yaml` contains sensitive information. Keep it safe!)
- In `config.yaml` fill out `general.hypixelApiKey` and `discord.key` and `discord.adminIds` ([How to get keys](./FAQ.md#how-to-get-discord-and-hypixel-keys))
- (Optional) for **Advanced users only:** Edit other options in `config.yaml` to fine tune the bridge

Then execute:

```shell
sudo docker container run -it --rm \
  -v ./config.yaml:/app/config.yaml \
  -v bridge-data:/app/config/ \
  ghcr.io/aidn3/hypixel-guild-discord-bridge:latest
```

Note that the path of the configuration source file must either be relative (with the `./`) or absolute.

Alternatively, providing the path as an argument to the docker container is also possible:

```shell
sudo docker container run -it --rm \
  -v ./config.yaml:/config/config.yaml \
  -v bridge-data:/app/config/ \
  ghcr.io/aidn3/hypixel-guild-discord-bridge:latest \
  /config/config.yaml
```

## Setup Via Discord

After installing and running the application, basic setup needs to be done to integrate the application.

Use Discord slash command `/settings` to configure the application:

- Set up the public and officer channels
- Check [How to prepare and add Minecraft account](FAQ.md#how-to-prepare-a-minecraft-account-to-be-added).
