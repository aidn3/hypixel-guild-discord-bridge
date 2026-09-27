import assert from 'node:assert'

export const HypixelLink = /^https:\/\/(?:[\w.]*\.)?hypixel\.net/

export function getUuidFromGuildChat(message: unknown): string {
  // this is minecraft protocol for chat message
  // @ts-expect-error fields exist but hidden
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const clickCommand = message.extra[0].clickEvent.value as string

  // clickCommand: "/viewprofile <UUID>"
  assert.ok(
    /^\/viewprofile [0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
      clickCommand
    )
  )

  const uuidWithDashes = clickCommand.split(' ', 2)[1].trim()
  const uuid = uuidWithDashes.replaceAll('-', '')
  assert.ok(uuid.length === 32, `Invalid uuid. given: ${uuid}`)

  return uuid
}
