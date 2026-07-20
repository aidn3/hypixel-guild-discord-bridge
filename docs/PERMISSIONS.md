# Permissions

This document outlines all permissions needed for the entire application to function.

This document uses these icons to indicate their importance, which are as follow:

| Icon | Type     | Explanation                                                                        |
| ---- | -------- | ---------------------------------------------------------------------------------- |
| 🟢   | Required | Permission to give to the appliocation for the absolute bare minumum functionality |
| 🔵   | Optional | Permission to give to the application for additional features/functionalities      |

## Guild in-game

These permissions can only be granted by the Guild Master of the in-game guild.

| Status | Permission                 | Reason                                                                                                                                                                                                                                                             |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🟢     | `/guild member <username>` | Viewing other members guild status require a special permission. Required to keep track of guild members ranks and other stats such as join timestamp, GEXP, etc. It is required to know whether the guild member is a staff who should receive special treatment. |
| 🟢     | bypass `/guild slowmode`   | To allow multiple people to talk from Discord platform                                                                                                                                                                                                             |
| 🔵     | `/guild mute`              | Allow Discord staff to mute members in-game using the slash command `/punishments`; playfully short mute members who lose in games like `!rr`                                                                                                                      |
| 🔵     | `/guild kick`              | Allow Discord staff members to kick members in-game using the slash command `/punishments`; enforce bans on members by auto kicking them if they rejoin                                                                                                            |
| 🔵     | `/guild log`               | Allow Discord staff to view in-game guild log via the slash command `/log`                                                                                                                                                                                         |

## In-game profile settings

| Status | Permission                                | Reason                                                                                                        |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 🔵     | allow guild members to `/msg` the account | Let guild members use chat commands in private without spamming the guild chat. e.g. `/msg <username> !level` |
| 🔵     | allow no one to `/party` the account      | To reduce bot detection, and other exploits that gets the account banned for botting                          |

## Discord application settings

These permissions can only be granted from [Discord applications dashboard](https://discord.com/developers/applications).

> Discord requires the developer to apply and declare the reason to grant these permissions if the bot has access to a [large audience](https://docs.discord.com/developers/events/gateway#privileged-intent-access-review).  
> Check this [official link](https://docs.discord.com/developers/events/gateway#privileged-intent-access-review) for more info.

| Status | Permission                                                                                     | Explanation                                                                                                                      | Reason                                                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | ["MESSAGE_CONTENT"](https://docs.discord.com/developers/events/gateway#message-content-intent) | allow Discord bot to read message content                                                                                        | This is required to read and forward messages to in-game guild chat                                                                                               |
| 🟢     | "GUILD_MEMBERS"                                                                                | allow Discord bot to list all members in a Discord server; get notified in real time when a member joins/leaves a Discord server | This is required to sync all users via the command `/syncall` with the conditions created using `/conditions`; Required to auto sync players status with in-game. |

## Discord server

Permissions to grant to the Discord bot from Discord server settings.

| Status | Permission       | Reason                                                                                       |
| ------ | ---------------- | -------------------------------------------------------------------------------------------- |
| 🟢     | View Channels    | Required to trace back chat cross channels if the chat channel has ever been changed         |
| 🔵     | Manage Roles     | If `/conditions roles` is used to auto assign users roles based on configurable conditions   |
| 🔵     | Manage Nicknames | If `/conditions nickname` is used to change users nicknames based on configurable conditions |

## Discord chat channels

These permissions are for the configured channels that the application is manually configured to use for its operation. For example:

- public chat channels to forward message to and from in-game guild chat.
- officer chat channels to forward message to and from in-game officer guild chat.
- log channels to log events and activities for staff to view

| Status | Permission           | Reason                                                                                                                                  |
| ------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | View Channel         | to be able to interact with the configured channel by reading/sending messages, etc                                                     |
| 🟢     | Read Message Content | This is required to read users messages, so it can be processed. e.g. forwarded to in-game guild chat                                   |
| 🟢     | Send Messages        | e.g. forward in-game messages/events to the configured discord channel, write logs, etc                                                 |
| 🟢     | Manage Webhooks      | to mimic users when sending messages                                                                                                    |
| 🟢     | Attach Files         | to render pictures and show them as part of chat, etc                                                                                   |
| 🟢     | Add Reactions        | add a custom reaction to users messages to indicate the message status. e.g. message has been profanity filtered, message blocked, etc. |
| 🟢     | User External Emojis | all emojis are saved in the application emojis slots. to preserve Discord server emojis slots                                           |
| 🟢     | Read Message History | to reduce spammy broadcast messages by finding out whether a message is too far in the history.                                         |
| 🔵     | Mention All Roles    | to ping staff in case of an emergency or if configured to do so. e.g. player requesting to join the guild                               |

## Discord implicit access

These permissions are always granted and used in real time to do various tasks. These are [Discord Gateway events](https://discord.com/developers/docs/events/gateway-events).

| Permission        | Explanation                                                                                                                            | Reason                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| "Guilds"          | Receive notification when the bot joins/leaves a Discord server and be informed in realtime about its other public stats               | Used in various places such as in Discord slash command `/conditions`                                                |
| "Guild Members"   | Receive notification when a user joins/leaves the discord Server                                                                       | Used for syncing purposes with in-game. e.g. `/guild role-conditions`                                                |
| "Guild Messages"  | Receive a notification when a message is created/deleted in a channel the bot has access to                                            | Used for [Discord chat channels](#discord-chat-channels) and to keep track of deleted bot panels. e.g. `/link-panel` |
| "Message Content" | Part of "Guild Messages". Receive the content of the message as well instead of just a notification that a message was created/deleted | Part of [Discord chat channels](#discord-chat-channels)                                                              |
| "Direct Messages" | Receive and interact with direct messages from users to the bot                                                                        | Allow users to execute chat commands                                                                                 |
