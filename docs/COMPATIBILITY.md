# Compatibility And Future Support

Application versions are defined based on [Semantic Versioning](https://semver.org).

| Support                                                       | Major                                  | Minor                                | Patch            |
| ------------------------------------------------------------- | -------------------------------------- | ------------------------------------ | ---------------- |
| [Config File](#config-file)                                   | Requires some rewrite                  | Future Compatible but not backward   | Fully Compatible |
| [Socket Support](#socket-support)                             | Not compatible                         | Not compatible                       | Not compatible   |
| [Officially Supported Plugins](#officially-supported-plugins) | Might require changes in `config.yaml` | Fully Compatible                     | Fully Compatible |
| [Community Maintained Plugins](#community-maintained-plugins) | Require a complete rewrite             | Semi Future-Compatible but can break | Fully Compatible |

## Config File

Config file is referred to `config.yaml` file that is responsible for how the application should start and behave.
Config file changes are always thoughtful and will nearly never break future compatibility without a reason.

Config file is not backward compatible on MINOR version due to the fact that some configuration can be deleted or migrated to an internal config path.
So, a new config file with removed config options will throw an error on an old version that still requires them.

## Socket Support

Sockets are never compatible with cross versions. Make sure the same version is always used at all times.
This is due to how sockets needs to be able to filter and rewrite events before transferring.

## Officially Supported Plugins

Officially maintained plugins are always supported and won't require any manual intervention when updating PATCH and
MINOR versions. They are auto updated along the application.  
Upon updating a major version, there is a chance `config.yaml` needs to be updated to continue using the plugin.  
All official plugins are listed in `./src/plugins/` directory.

## Community Maintained Plugins

Community made plugins are only supported on PATCH version update.  
Upon updating to a minor version, there is a chance it requires to change the code to continue using the plugin. Code
changes such as how imports are defined, how API is accessed, etc.
