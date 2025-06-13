# Permissions

| Name    | Description                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Anyone  | Anything that usually can be seen in-game guild chat<br> e.g. public chat, join/leave notification, etc            |
| Helper  | Anything that requires special permission to see in-game guild chat<br> e.g. officer chat, mute notification, etc. |
| Officer | Superset of **Helper** role. Given to trusted members                                                              |
| Admin   | Special permission that is used to administrate the service.<br> Note: Only ONE person can have this permission!   |

## Supported Discord Commands

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
| `/execute`                          | Send direct commands to all minecraft clients           | Admin          |

## Supported Events

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

## Supported Chat Commands

These commands can be executed from any chat channel the bridge can see.
This includes guild/officer chat as well as private `/msg` and direct messaging channels.

Most [Soopy commands](https://soopy.dev/commands) are supported and can be used by executing `!soopy rtca`.
A shorter version can also be used: `!- rtca`

| Command       | Description                                                | Permission |
| ------------- | ---------------------------------------------------------- | ---------- |
| !8ball        | Replica of **8 ball**.`!8ball Will I win?`                 | Anyone     |
| !bedwars      | Returns a player's bedwars common stats                    | Anyone     |
| !bits         | Returns the best bit items to purchase for the most profit | Anyone     |
| !calculate    | Calculate a math expression: `!calculate 1+2*3`            | Anyone     |
| !catacomb     | Get a player's catacombs and class level                   | Anyone     |
| !darkauction  | Show the remaining time till next dark auction             | Anyone     |
| !explain      | Explain what the bridge does and how it works              | Anyone     |
| !guild        | Give a summary of the guild of a given user                | Anyone     |
| !help         | Show a command usage `!help runs`                          | Anyone     |
| !iq           | Give a random IQ number to the guild member                | Anyone     |
| !kuudra       | Get a player's kuudra completions `!kuudra hot`            | Anyone     |
| !level        | Get a player's skyblock level                              | Anyone     |
| !magicalpower | Returns a player's highest recorded skyblock Magical Power | Anyone     |
| !networth     | Calculate the in-game networth of a player                 | Anyone     |
| !startparty   | Create public !parties to be viewed by guild members       | Anyone     |
| !pb           | Returns a players best dungeon run time `!pb aidn5 m7`     | Anyone     |
| !rps          | Play rock paper scissors `!rps rock`                       | Anyone     |
| !roulette     | Has a chance of muting a player                            | Anyone     |
| !runs         | Return a player's floor completions `!runs m7`             | Anyone     |
| !rtca         | Return runs count to reach an average class level          | Anyone     |
| !secrets      | Return a player's total dungeon secrets                    | Anyone     |
| !skill        | Return player's skill level `!skill mining`                | Anyone     |
| !slayer       | Return a player's slayer stats `!slayer wolf`              | Anyone     |
| !soopy        | Use Soopy API to execute commands `!- purse`               | Anyone     |
| !status       | Show a player's Hypixel status and current location        | Anyone     |
| !vengeance    | Try your luck against another player for a 15 minute mute  | Anyone     |
| !weight       | Calculate the **Senither Weight** of a player              | Anyone     |
| !toggle       | Enable/disable commands `!toggle 8ball`                    | Officer    |
| !execute      | Run a command directly `!execute /guild party`             | Admin      |

## Available Plugins

Application has an official public API and supports custom plugins to enhance potential.  
Loaded plugins can be configured in the `config.yaml` file when [configuring the application](#configure).  
To create custom plugins see [Documentation And Tutorials](#documentation-and-tutorials).

These are the supported official plugins that come bundled with the application:

| Plugin            | Description                                                                             | Importance      | Notice                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auto-restart      | Schedule restarting every 24 hours                                                      | Essential       | A process monitor is required to restart the application after it shuts down. Not periodically restarting can lead to high RAM usage.                                                              |
| limbo-plugin      | Trap Minecraft client to stay in Hypixel limbo                                          | Essential       | Being outside of limbo for prolonged periods can lead to the account being banned. Only disable if required.                                                                                       |
| punishment-plugin | Enforces punishments and prevents punishment evasion                                    | Recommended     | Plugin will mute users but won't ban them, instead it will send a notification in officer chat.                                                                                                    |
| warp-plugin       | Warp players out of their lobbies                                                       | Quality of Life | Incompatible with `limbo-plugin`. Disable one before enabling the other one.                                                                                                                       |
| reaction-plugin   | Send a greeting/reaction message when a member joins/leaves or is kicked from the guild | Quality of Life | N/A                                                                                                                                                                                                |
| dark-auction      | Send a reminder when a skyblock dark auction is starting                                | Quality of Life | Sends a reminder 5 minutes and 1 minute before the dark auction.                                                                                                                                   |
| starfall-cult     | Send a reminder when the skyblock starfall cult gathers                                 | Quality of Life | N/A                                                                                                                                                                                                |
| STuF              | Bypass Hypixel restriction on hyperlinks                                                | Optional        | Requires the installation of a minecraft client mod/module that supports [STuF](https://github.com/stuffyerface/STuF) such as [ImageLinkFix](https://www.chattriggers.com/modules/v/ImageLinkFix). |

## How to use execute arbitrarily commands

**Note: Only the one person who has administrator permissions can execute commands!**  
From In-game: `/gc !execute /guild party`  
From Discord: `/execute /guild party`
