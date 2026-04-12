# Frequently Asked Questions

<!-- TOC -->

- [Frequently Asked Questions](#frequently-asked-questions)
  - [How to get Discord And Hypixel Keys](#how-to-get-discord-and-hypixel-keys)
  - [How to prepare a Minecraft account to be added](#how-to-prepare-a-minecraft-account-to-be-added)
  - [Use the account while it is connected](#use-the-account-while-it-is-connected)
  - [How to temporarily gain back access to the account](#how-to-temporarily-gain-back-access-to-the-account)
  - [What to do if I logged on Hypixel without properly disconnecting it first](#what-to-do-if-i-logged-on-hypixel-without-properly-disconnecting-it-first)
  - [How to add a Minecraft Account](#how-to-add-a-minecraft-account)
  - [How to manage the Minecraft account after it is added](#how-to-manage-the-minecraft-account-after-it-is-added)
  - [If the Discord channels get renamed, do you need to change anything?](#if-the-discord-channels-get-renamed-do-you-need-to-change-anything)
  - [Why chat is delayed between platforms and channels](#why-chat-is-delayed-between-platforms-and-channels)
  - [How to manage profanity filter](#how-to-manage-profanity-filter)
  - [How to utilize verification system](#how-to-utilize-verification-system)
  - [Why the Warp command takes too long](#why-the-warp-command-takes-too-long)
  - [What are the chances for chat command !vengeance?](#what-are-the-chances-for-chat-command-vengeance)
  - [How to enable and manage in-game guild system](#how-to-enable-and-manage-in-game-guild-system)
  - [How to auto manage in-game guild ranks](#how-to-auto-manage-in-game-guild-ranks)
  - [How to manage guild join requirements](#how-to-manage-guild-join-requirements)
  - [Auto accept guild join requests](#auto-accept-guild-join-requests)
  - [Use guild join waitlist](#use-guild-join-waitlist)
  <!-- TOC -->

## How to get Discord And Hypixel Keys

Get hypixel key at [Hypixel Developer Dashboard](https://developer.hypixel.net).
Make an application for a key and wait for its activation.

> Do **NOT generate and use developing key** for the application!

For Discord bot, check [This page of a guide by DiscordJS](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).

## How to prepare a Minecraft account to be added

While the Minecraft account is being actively used in the application, you won't be able to use it on Hypixel Network.
To avoid disruptions, make sure you:

- choose a Minecraft account that you don't play on it often on Hypixel Network.
- don't have anything you wish to access later like items on Hypixel Skyblock, etc. If you do, you can transfer the items first and finish any business before handing it off.

To prepare the account for the best experience, make sure you:

- invite the account to the guild you wish the account to reside in.
- change `/privacy` in-game, so only guild members can private message and party it at most.
- enable chat by doing `/togglechat` in-game

## Use the account while it is connected

Only application administrators have the permission to execute arbitrarily commands.

From In-game via guild/officer chat or via private messaging: `/gc !execute /guild party`  
From Discord via slash commands: `/execute /guild party`

## How to temporarily gain back access to the account

The account is still yours! However, to avoid unexpected disruptions,
make sure you execute slash command `/disconnect` on Discord to temporarily logout from the Minecraft account.
You can gain back the access to the account anytime temporarily by just doing so.

After you are finished with your business, execute the slash command `/reconnect` on Discord to return the account.

> Application will auto reconnect again if it restarts as well!

## What to do if I logged on Hypixel without properly disconnecting it first

In case you log in on Hypixel directly without first disconnecting the account properly from the Application,
Hypixel will kick the account for "You logged in from another location".
The Application will realize your actions and will cease all attempts at reconnecting for the time being,
till the application restarts or slash command `/reconnect` is executed on Discord.

## How to add a Minecraft Account

Log out from Hypixel Network before anything.

Execute Discord slash command `/settings`, then press `Minecraft` category button.
Under `Instances` section press `add` to initiate the adding process.

A popup will open requiring you to choose a name for the new Minecraft instance.
This name will be used as a display. It is recommended to enter the guild name there.

> You will NOT be required to enter the account credentials including the email, password or the account holder's name!

After you finish filling the information, press enter.
The process of creating the Minecraft instance will start.
After the initiation, the application will generate a Microsoft URL link that you can use on browser to authenticate the Minecraft account.
Make sure you use incognito/private browsing when opening the URL link, so you don't accidentally authenticate a different account such as your main account.

## How to manage the Minecraft account after it is added

Use Discord slash command `/disconnect` to temporarily disconnect the Minecraft account to gain back the access.

Use Discord slash command `/reconnect` to return the Minecraft account to the application. Make sure you have logged out of the account.

If you wish to permanently delete the Minecraft account from the application,
use Discord slash command `/settings` -> `Minecraft` -> `Instance` -> `Remove`

## If the Discord channels get renamed, do you need to change anything?

You can change them as you like, as long as you don't delete or replace them with a new one.
Just make sure the application has access to them, after you finish with your changes.

> Technical: The application uses channel id.

## Why chat is delayed between platforms and channels

This is how it usually goes from Minecraft to Discord for example:

- User sends a message in Minecraft guild chat
- The server in Minecraft will take the message and forward it whenever it sees fit
- Application will then receive the message
- The application will have to forward the message to Discord
- Discord will then take its time to show it all users
  At every step there is a latency delay. Maybe the delay isn't as much individually, but it accumulates quickly.
  Is the delay 200 millisecond on average? With 5 steps, it now takes 1 second on average.

There are many other tasks the application must do before forwarding a message.
Some of them include:

- checking who is the owner of the message and whether they are punished (muted or banned for example).
- sanitizing the message from any profanity for example
- adding the user to the application database for leaderboard and other statistical purposes
- logging the message for record purposes

There is also a messaging queue:

- queuing messages with fixed delay between them as to not overwhelm the destination
  (If hypixel is the destination for example, sending too many messages quickly will result in a server kick)
- After sending a message, the queue will be put on hold till the sent message is shown to confirm its status before moving on to the next in queue
- There are also priority queue where some internally generated messages are sent BEFORE the chat messages. Like for status checking etc.
  This usually happens when sending to Minecraft server. Status checking like using `/guild list`.

## How to manage profanity filter

Use Discord slash command `/profanity` to manage profanity filter.
Profanity filter is based on [this public list](https://github.com/web-mech/badwords-list/blob/main/lib/array.ts) of bad words.
This filter is included by default in the application. You can test it out by saying "Fuck".

You can manage any additional words you wish to add on top of the list by using the Discord slash command `/profanity include`

You can also delete words from the base filter using `/profanity exclude`

You can also replace words with different ones instead of just censoring them
by creating custom Regex search via the Discord slash command `/profanity replace`.
To test before using, you can visit [this online playground](https://www.jsplayground.dev/) and use this code as a base for experimentation:

```js
const search = 'Hello'
const replace = 'Replaced'
const testSentence = 'Hello there'

console.log(testSentence.replaceAll(new RegExp(search, 'gi'), replace))
```

## How to utilize verification system

Users can execute the Discord slash command `/link` to link their Discord account to a Minecraft account.  
All chat messages will use the Minecraft username instead of the user Discord's nickname.  
Users punishments will also transfer between in-game and Discord channels the application resides in.

Users can execute Discord slash command `/unlink` to unlink their Discord account from the Minecraft account.
Alternatively, users can use chat command `!unlink` in-game in case they lose access to their Discord account.

Staff and admins have access to verification management tool under the Discord slash command `/verification`.  
The tool allow staff and admins to do various management actions such as checking the link status, unlinking other users, etc.

Staff can enforce all users to `/link` before speaking in Discord channels (where the application resides in)
by executing the Discord slash command `/settings`, then navigating to `Discord` category, before pressing `Enforce Verification`.

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

## What are the chances for chat command !vengeance?

There is a pity system in this command, but it will average out to: `3%` chance to win, `47%` to lose, `49%` chance to draw/neutral.

As for how the pity system works:  
Command will first check for `win`, which is to mute your target: It starts with `1/32` chance to succeed.

If `win` fails, the command will check for `lose`, which is to mute yourself: It starts with `1/2` chance to succeed.
The pity is reversed here. You can only succeed (aka getting yourself muted) up to `5` times in a row before it gives you fail-pity to not get yourself muted.

If `lose` fails, it will give a `neutral` response not muting anyone.

After `12` consecutive failures to `win`, be it by reaching `lose` or `neutral` outcome,
the pity will start kicking in gradually upping the chances till `24th` try which is guaranteed to succeed.
The pity is counted globally across all users.

## How to enable and manage in-game guild system

To manage a guild, it must be registered first using the Discord slash command `/guild register`.
By default, all in-game guilds that are connected via any Minecraft instance will be automatically registered.

A registered guild can be managed via the command `/guild settings`.
By default, all settings and features are toggled off unless they are explicitly changed.

To delete all information regarding a guild, execute the Discord slash command `/guild unregister`.

## How to auto manage in-game guild ranks

Before starting, the in-game guild must be registered via `/guild register`.
Check [this FAQ section](#how-to-enable-and-manage-in-game-guild-system) for further information regarding the registration.

To manage in-game guild ranks, select all the roles that can be changed from in `/guild settings`.
This is done to avoid demoting/promoting staff members as well as special guild ranks such as honorary ranks.

After that, execute the command `/guild role-conditions add` to add new guild ranks conditions.
During the creation of each condition, a guild rank must be selected to associate with the condition.
When a guild member meets the condition requirement, the guild rank will be automatically given to that guild member.

The chat command `!sync` can be used by any guild member to automatically update their guild rank in case it is needed.
The same chat command can also be used by staff to update guild members rank. For example, `!sync Steve`.

Anyone can view all guild ranks requirements by using the chat command `!ranks`.

## How to manage guild join requirements

Before starting, the in-game guild must be registered via `/guild register`.
Check [this FAQ section](#how-to-enable-and-manage-in-game-guild-system) for further information regarding the registration.

After that, execute the command `/guild join-conditions add` to add new guild join conditions.
Via the Discord slash command `/guild settings`, it is possible to change how many conditions must be met before allowing the player to join the guild.
By default, it is set to `1`. That means the player must meet just `1` join requirement before allowing the player to join the guild.

> Guild banned players will not be able to join the guild regardless of the join requirements.

## Auto accept guild join requests

Before enabling this feature, Check [How to manage guild join requirements](#how-to-manage-guild-join-requirements).

In Discord slash command `/guild settings`, it is now safe to enable `Auto accept join requests`.
From now on, any player who requests to join the guild and meets the requirements will be automatically accepted in the guild.

> At least one join condition must be set to allow automatic checking.

## Use guild join waitlist

Before enabling this feature, Check [How to manage guild join requirements](#how-to-manage-guild-join-requirements).

Staff may add players to the guild join waitlist by using the Discord slash command `/guild waitlist add`.  
Staff may create a Discord panel that auto updates and show the current waitlist status for everyone using the Discord slash command `/guild waitlist create-panel`

To allow players to self-signup into the guild join waitlist, enable the option `Allow users to self-signup` in the Discord slash command `/guild settings`.
After enabling this feature, players can now press the special button in the specially created message from `/guild waitlist create-panel` at any time to add/remove themselves.

> At least one join condition must be set to allow self-signup.

The waitlist will be automatically checked every couple minutes.
When the guild has enough space to accept more members, the application will start inviting the people from the waitlist in order from the first to last.
Every player has 24 hours to accept the offer.
If the player does not accept within the allocated time, they will be completely removed from the waitlist and the next player will be invited from the waitlist.

When a player is invited via this system, the player will receive a guild join invite as well as a Discord private message explaining the situation.
In the Discord private message, there will be options to allow the user to accept/decline/reschedule the offer. These Discord buttons:

- When accepting the offer, the player will receive a guild join invite in-game and the status of the invite will be displayed in the Discord private message. They may press this button as many times as needed as long as the invite is still valid.
- When declining the offer, the player will be instantly removed from the waitlist and the next player in the waitlist will be invited instead.
- When rescheduling the offer, the player will be put last in the waitlist and a 24-hours grace period will put in place, during which the player will not be invited even if they are the first in line in the waitlist.

After the player has been officially invited, the user may accept the offer by:

- sending a join request to the guild at any time, and it will be automatically accepted by the application.
- pressing the "Invite" button in the Discord private message from the application to receive a join request from the guild.
- using the chat command `!invite` to receive a join request from the guild.
