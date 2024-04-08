// Package official index.d.ts is incorrect.
// This fixes some of those mistakes
declare module "prismarine-chat" {
  import { ChatMessage } from "prismarine-chat"

  // Functions are not static.
  // They require an object created via the default function
  export interface PrismarineChatFormatter {
    fromNotch: (message: string) => ChatMessage
    fromNetwork: (messageType: number, parameters: Record<string, object>) => ChatMessage
  }

  // argument can not only be string but also a Registry object
  type PrismarineChatConstructor = (registryOrVersion: string | object) => PrismarineChatFormatter
  declare const constructor: PrismarineChatConstructor

  // The loader is directly accesses not via "_default"
  export = constructor
}

export { ChatMessage } from "prismarine-chat"
