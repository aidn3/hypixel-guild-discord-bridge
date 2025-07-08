# Migration

- [Migrate from 3.x to 4.x](#migrate-from-3x-to-4x)
- [Migrate from 2.x to 3.x](#migrate-from-2x-to-3x)

## Migrate from 3.x to 4.x

### config.yaml

It is advised to start with a clean `config.yaml` file by copying `config_example.yaml` and saving the old file
somewhere else.
Most notable changes:

- Add `version: 2`
- Add `shareMetrics` to `general`
- Move `discord.adminId` to `discord.adminIds` and make it into a list
- Remove all options in `discord` section except `key` and `adminIds`
- Remove `profanity`, `commands`, `minecraft`, `loggers` sections since they have been moved out to an internal
  configuration at `./config/` directory that is directly controlled by the application via discord command `/settings`
- Remove `socket` section entirely since the feature has been completely removed.
- Remove `useIngameCommand` and `interval` in `metrics` section.
- Remove `plugins` section entirely since it has been migrated to newer system.

### Application Configurations

Application now has a discord slash command `/settings` that controls most of the application configurations.
This includes official plugins, discord channels and roles, log channels, minecraft instances, and many other features and components.

Old configuration are NOT auto migrated to the new format.
Make sure to check the new settings and apply back all your old configurations.

### Internal Configurations

All configurations are saved at `./config/` directory. Not all of them are directly exposed to users to modify.

- You only need to save `./config/` directory and `config.yaml` file for backups.
- If you change something, make sure all changes are **valid and will not break** the application in any unintentional.
- You can safely delete any file there to reset a part of the application.

## Custom Plugins

There is a directory called `./plugins` at the root of the project. Move all plugins to this directory.
Application will auto-detect and load them.  
Only applications ending with `.ts` file extension and at the top of the directory will be loaded.

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
