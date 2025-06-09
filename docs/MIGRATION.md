# Migration

- [Migrate from 3.x to 4.x](#migrate-from-3x-to-4x)
- [Migrate from 2.x to 3.x](#migrate-from-2x-to-3x)

## Migrate from 3.x to 4.x

### config.yaml

It is advised to start with a clean `config.yaml` file by copying `config_example.yaml` and saving the old file
somewhere else.
Most notable changes:

- Add `version: 2`
- Move `discord.adminId` to `discord.adminIds` and make it into a list
- Remove all options in `discord` section except `key` and `adminIds`
- Remove `profanity`, `commands`, `minecraft`, `loggers` sections since they have been moved out to an internal
  configuration at `./config/` directory that is directly controlled by the application via discord command `/settings`
- Remove `socket` section entirely since the feature has been completely removed.
- Remove `useIngameCommand` and `interval` in `metrics` section.
- Remove all official plugins in `plugins` section except for any custom plugin

### Application Configurations

Application now has a discord command `/settings` that controls most of the application configurations.

- `/settings feature toggle` to toggle any official plugin instead of changing `plugins` in `config.yaml`
- Discord settings
  - `/settings discord public-channel` is equivalent of the old `config.yaml` option `discord.publicChannelIds`
  - `/settings discord officer-channel` to set Officer channels
  - `/settings discord helper-role` to set roles that have HELPER permission in the application
  - `/settings discord officer-role` to set roles that have OFFICER permission in the application
  - `/settings discord logger-channel` to set discord channels to forward curated application logs to
- Minecraft settings
  - `/settings minecraft add/remove` to add and remove minecraft instances instead of the old `config.yaml` option `minecraft.instances`
  - `/settings minecraft set-admin` is equivalent of the old `config.yaml` option `commands.adminUsername`

### Internal Configurations

All configurations are saved at `./config/` directory. Not all of them are directly exposed to users to modify.

- You only need to save `./config/` directory and `config.yaml` file for backups.
- If you change something, make sure all changes are **valid and will not break** the application in any unintentional.
- You can safely delete any file there to reset a part of the application.

## Migrate from 2.x to 3.x

Breaking changes:

- `config.yaml` has been reformatted. Check the new `config_example.yaml` and compare it with the old config file.
- Version 3.x websocket is incompatible with older versions. You cannot connect the new version with the old one.
- Chat Commands have been moved to their own instance in `config.yaml`. Only enable one instance when using websocket.
- Project has been moved to ESM. Old plugins that still use commonjs will not work anymore.
- The Minecraft bot and websocket have been stripped down to bare metal. Any plugins that use those features must be
  updated accordingly.
- The punishment system has been revised and now uses `./configs/` to save its state as a file. The `./configs/`
  directory is now git-ignored.
- Any unexpected errors during the launching phase will result in a shutdown with an exit code instead of sending a
  notification.
