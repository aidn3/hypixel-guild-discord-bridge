import * as t from 'ts-interface-checker'

export const InstanceType = t.enumtype({
  'Main': 'main',
  'Plugin': 'plugin',
  'Metrics': 'metrics',
  'Socket': 'socket',
  'Commands': 'commands',
  'Discord': 'discord',
  'Minecraft': 'minecraft',
  'Logger': 'webhook'
})

export const BaseEvent = t.iface([], {
  'localEvent': 'boolean'
})

export const InformEvent = t.iface(['BaseEvent'], {
  'instanceName': 'string',
  'instanceType': 'InstanceType'
})

export const PunishmentAddEvent = t.iface(['InformEvent'], {
  'type': 'PunishmentType',
  'userName': 'string',
  'userUuid': t.union('string', 'undefined'),
  'userDiscordId': t.union('string', 'undefined'),
  'reason': 'string',
  'till': 'number'
})

export const PunishmentForgiveEvent = t.iface(['InformEvent'], {
  'userIdentifiers': t.array('string')
})

export const PunishmentType = t.enumtype({
  'Mute': 'mute',
  'Ban': 'ban'
})

const exportedTypeSuite: t.ITypeSuite = {
  InstanceType,
  BaseEvent,
  InformEvent,
  PunishmentAddEvent,
  PunishmentForgiveEvent,
  PunishmentType
}
export default exportedTypeSuite
