/**
 * This module was automatically generated by `ts-interface-builder`
 */
import * as t from "ts-interface-checker";
// tslint:disable:object-literal-key-quotes

export const GeneralConfig = t.iface([], {
  "hypixelApiKey": "string",
});

export const DiscordConfig = t.iface([], {
  "instanceName": "string",
  "key": t.union("string", "null"),
  "adminId": "string",
  "publicChannelIds": t.array("string"),
  "officerChannelIds": t.array("string"),
  "helperRoleIds": t.array("string"),
  "officerRoleIds": t.array("string"),
});

export const MinecraftConfig = t.iface([], {
  "bridgePrefix": "string",
  "instances": t.array("MinecraftInstanceConfig"),
});

export const MinecraftInstanceConfig = t.iface([], {
  "instanceName": "string",
  "email": "string",
  "proxy": t.union("ProxyConfig", "null"),
});

export const CommandsConfig = t.iface([], {
  "enabled": "boolean",
  "adminUsername": "string",
  "commandPrefix": "string",
  "disabledCommand": t.array("string"),
});

export const ModerationConfig = t.iface([], {
  "heatPunishment": "boolean",
  "kicksPerDay": "number",
  "immune": t.array("string"),
  "profanity": "ProfanityConfig",
});

export const ProfanityConfig = t.iface([], {
  "enabled": "boolean",
  "whitelist": t.array("string"),
  "blacklist": t.array("string"),
});

export const MetricsConfig = t.iface([], {
  "enabled": "boolean",
  "port": "number",
  "prefix": "string",
  "useIngameCommand": "boolean",
  "interval": "number",
});

export const SocketConfig = t.iface([], {
  "enabled": "boolean",
  "key": "string",
  "uri": "string",
  "type": t.union(t.lit('server'), t.lit('client')),
  "port": "number",
});

export const ProxyConfig = t.iface([], {
  "host": "string",
  "port": "number",
  "protocol": "ProxyProtocol",
});

export const ProxyProtocol = t.enumtype({
  "Http": "http",
  "Socks5": "socks5",
});

export const ApplicationConfig = t.iface([], {
  "general": "GeneralConfig",
  "discord": "DiscordConfig",
  "minecraft": "MinecraftConfig",
  "loggers": t.array("string"),
  "commands": "CommandsConfig",
  "moderation": "ModerationConfig",
  "metrics": "MetricsConfig",
  "socket": "SocketConfig",
  "plugins": t.array("string"),
});

const exportedTypeSuite: t.ITypeSuite = {
  GeneralConfig,
  DiscordConfig,
  MinecraftConfig,
  MinecraftInstanceConfig,
  CommandsConfig,
  ModerationConfig,
  ProfanityConfig,
  MetricsConfig,
  SocketConfig,
  ProxyConfig,
  ProxyProtocol,
  ApplicationConfig,
};
export default exportedTypeSuite;
