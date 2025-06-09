# Frequently Asked Questions

<!-- TOC -->

- [Frequently Asked Questions](#frequently-asked-questions)
  - [How to get Discord And Hypixel Keys](#how-to-get-discord-and-hypixel-keys)
  - [Why the Warp command takes too long](#why-the-warp-command-takes-too-long)
  <!-- TOC -->

## How to get Discord And Hypixel Keys

Get hypixel key at [Hypixel Developer Dashboard](https://dashboard.hypixel.net).
Make an application for a key and wait for its activation.

> Do **NOT generate and use developing key** for the application!

For Discord bot, check [This page of a guide by DiscordJS](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).

## Why the Warp command takes too long

This is intended for the **safety of the Minecraft client** at Hypixel network.
The client sits in `/limbo` during the usual operation of the application idling
to ensure that **Hypixel Watchdog does not detect its unusual presence**.

When a user sends the `!warp` command, the client will momentarily
leave the limbo in preparation to actually executing the command.
This will take a while since the client needs to change lobbies multiple times:
From limbo to main lobby, to Skyblock private island, to random Skyblock hub.
And between every lobby change, there is a cooldown that is need to be awaited to prevent receiving the error that swapping lobby is on cooldown.

On top of that, the client must idle for couple seconds before sending the party command since spamming too many commands,
which will happen when sending the party request and subsequent party warping,
can result in the client being kicked out of the lobby.

This entire preparation sequence can take around 30 seconds to finish.
