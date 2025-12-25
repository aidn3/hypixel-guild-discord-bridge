import http from 'node:http'

import { HttpStatusCode } from 'axios'
import type { RawData } from 'ws'
import { WebSocket, WebSocketServer } from 'ws'

import type { WebConfig } from '../application-config.js'
import type Application from '../application.js'
import type { ChatEvent } from '../common/application-event.js'
import { InstanceType, MinecraftSendChatPriority } from '../common/application-event.js'
import { Instance } from '../common/instance.js'

interface WebMessagePayload {
  type?: string
  token?: string
  data?: string
  instance?: string
}

interface WebSocketAckMessage {
  type: 'ack'
  success: boolean
  error?: string
}

interface WebSocketChatMessage {
  type: 'chat'
  data: WebChatPayload
}

interface WebChatPayload {
  eventId: string
  createdAt: number
  message: string
  channelType: ChatEvent['channelType']
  instanceName: string
  instanceType: ChatEvent['instanceType']
  user: {
    displayName: string
    minecraft?: {
      id: string
      name: string
    }
    discord?: {
      id: string
      displayName: string
    }
  }
  replyUsername?: string
  channelId?: string
  guildRank?: string
  hypixelRank?: string
  rawMessage?: string
}

interface DispatchResult {
  status: number
  body: {
    success: boolean
    error?: string
  }
}

export default class WebServer extends Instance<InstanceType.Utility> {
  private readonly startTime = Date.now()
  private readonly httpServer: http.Server
  private readonly wsServer: WebSocketServer
  private readonly connections = new Set<WebSocket>()
  private readonly config: WebConfig

  constructor(application: Application, config: WebConfig) {
    super(application, 'web-server', InstanceType.Utility)

    this.config = config

    this.httpServer = http.createServer((request, response) => {
      void this.handleHttpRequest(request, response).catch((error: unknown) => {
        this.logger.error('Failed to handle web request', error)
        if (!response.headersSent) {
          this.sendJson(response, HttpStatusCode.InternalServerError, {
            success: false,
            error: 'Internal server error'
          })
          return
        }
        response.end()
      })
    })

    this.wsServer = new WebSocketServer({ noServer: true })
    this.wsServer.on('connection', (socket) => {
      this.onWebSocketConnection(socket)
    })

    this.httpServer.on('upgrade', (request, socket, head) => {
      if (!this.isMessageRoute(request.url)) {
        socket.destroy()
        return
      }

      this.wsServer.handleUpgrade(request, socket, head, (client) => {
        this.wsServer.emit('connection', client, request)
      })
    })

    this.httpServer.listen(this.config.port, () => {
      this.logger.info(`Web server listening on port ${this.config.port}`)
    })

    this.application.on('chat', (event) => {
      this.broadcastChat(event)
    })

    this.application.addShutdownListener(() => {
      this.shutdown()
    })
  }

  private isMessageRoute(url: string | undefined): boolean {
    if (!url) return false
    return url.split('?')[0] === '/message'
  }

  private async handleHttpRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    const route = request.url?.split('?')[0]
    if (!route) {
      this.sendJson(response, HttpStatusCode.NotFound, { success: false, error: 'Invalid route' })
      return
    }

    if (route === '/uptime') {
      if (request.method !== 'GET') {
        this.sendMethodNotAllowed(response, ['GET'])
        return
      }

      this.sendJson(response, HttpStatusCode.Ok, {
        success: true,
        uptime: Date.now() - this.startTime
      })
      return
    }

    if (route === '/message') {
      if (request.method !== 'POST') {
        this.sendMethodNotAllowed(response, ['POST'])
        return
      }

      await this.handleMessageRequest(request, response)
      return
    }

    this.sendJson(response, HttpStatusCode.NotFound, { success: false, error: 'Invalid route' })
  }

  private async handleMessageRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    let payload: WebMessagePayload

    try {
      const body = await this.readBody(request)
      if (!body) {
        this.sendJson(response, HttpStatusCode.BadRequest, { success: false, error: 'Missing request body' })
        return
      }

      payload = JSON.parse(body) as WebMessagePayload
    } catch (error: unknown) {
      this.logger.warn('Invalid /message payload', error)
      this.sendJson(response, HttpStatusCode.BadRequest, { success: false, error: 'Invalid JSON payload' })
      return
    }

    if (!payload || typeof payload !== 'object') {
      this.sendJson(response, HttpStatusCode.BadRequest, { success: false, error: 'Invalid payload' })
      return
    }

    const result = await this.dispatchMessage(payload)
    this.sendJson(response, result.status, result.body)
  }

  private async dispatchMessage(payload: WebMessagePayload): Promise<DispatchResult> {
    if (!payload.token || payload.token !== this.config.token) {
      return {
        status: HttpStatusCode.Unauthorized,
        body: { success: false, error: 'Invalid token' }
      }
    }

    if (payload.data == undefined || typeof payload.data !== 'string' || payload.data.trim().length === 0) {
      return {
        status: HttpStatusCode.BadRequest,
        body: { success: false, error: 'Missing message data' }
      }
    }

    const message = payload.data.trim()
    const target = this.resolveTargetInstances(payload.instance)
    if (target.error) {
      return {
        status: HttpStatusCode.BadRequest,
        body: { success: false, error: target.error }
      }
    }

    try {
      await this.application.sendMinecraft(target.instances, MinecraftSendChatPriority.Default, undefined, message)
      return {
        status: HttpStatusCode.Ok,
        body: { success: true }
      }
    } catch (error: unknown) {
      this.logger.error('Failed to send web message to Minecraft', error)
      return {
        status: HttpStatusCode.InternalServerError,
        body: { success: false, error: 'Failed to send message' }
      }
    }
  }

  private resolveTargetInstances(requested: string | undefined): { instances: string[]; error?: string } {
    const available = this.application.getInstancesNames(InstanceType.Minecraft)
    if (available.length === 0) {
      return { instances: [], error: 'No minecraft instances are connected.' }
    }

    const requestedName = requested?.trim()
    if (requestedName) {
      const match = available.find((name) => name.toLowerCase() === requestedName.toLowerCase())
      if (!match) {
        return { instances: [], error: `Unknown minecraft instance "${requestedName}".` }
      }
      return { instances: [match] }
    }

    const configInstance = this.config.minecraftInstance?.trim()
    if (configInstance) {
      const match = available.find((name) => name.toLowerCase() === configInstance.toLowerCase())
      if (!match) {
        return { instances: [], error: `Configured minecraft instance "${configInstance}" is not available.` }
      }
      return { instances: [match] }
    }

    if (available.length === 1) {
      return { instances: [available[0]] }
    }

    return {
      instances: [],
      error: 'Multiple minecraft instances are available. Specify an instance.'
    }
  }

  private onWebSocketConnection(socket: WebSocket): void {
    this.connections.add(socket)
    this.logger.info('WebSocket client connected')

    socket.on('close', () => {
      this.connections.delete(socket)
    })

    socket.on('error', (error) => {
      this.logger.warn('WebSocket error', error)
      this.connections.delete(socket)
    })

    socket.on('message', (data) => {
      void this.handleWebSocketMessage(socket, data).catch((error: unknown) => {
        this.logger.error('Failed to handle websocket message', error)
        this.sendWebSocket(socket, { type: 'ack', success: false, error: 'Failed to handle message' })
      })
    })
  }

  private async handleWebSocketMessage(socket: WebSocket, data: RawData): Promise<void> {
    let payload: WebMessagePayload
    try {
      const text = WebServer.rawDataToString(data)
      payload = JSON.parse(text) as WebMessagePayload
    } catch {
      this.sendWebSocket(socket, { type: 'ack', success: false, error: 'Invalid JSON payload' })
      return
    }

    if (!payload || typeof payload !== 'object') {
      this.sendWebSocket(socket, { type: 'ack', success: false, error: 'Invalid payload' })
      return
    }

    if (payload.type !== undefined && payload.type !== 'message') {
      this.sendWebSocket(socket, { type: 'ack', success: false, error: 'Unsupported payload type' })
      return
    }

    const result = await this.dispatchMessage(payload)
    this.sendWebSocket(socket, {
      type: 'ack',
      success: result.body.success,
      error: result.body.error
    })
  }

  private static rawDataToString(data: RawData): string {
    if (typeof data === 'string') return data
    if (Buffer.isBuffer(data)) return data.toString('utf8')
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
    return Buffer.from(data as ArrayBufferView).toString('utf8')
  }

  private broadcastChat(event: ChatEvent): void {
    if (this.connections.size === 0) return
    const message: WebSocketChatMessage = {
      type: 'chat',
      data: this.buildChatPayload(event)
    }

    const payload = JSON.stringify(message)
    for (const socket of this.connections) {
      if (socket.readyState !== WebSocket.OPEN) {
        this.connections.delete(socket)
        continue
      }

      try {
        socket.send(payload)
      } catch (error: unknown) {
        this.logger.warn('Failed to send websocket payload', error)
        this.connections.delete(socket)
      }
    }
  }

  private buildChatPayload(event: ChatEvent): WebChatPayload {
    const mojang = event.user.mojangProfile()
    const discord = event.user.discordProfile()

    const payload: WebChatPayload = {
      eventId: event.eventId,
      createdAt: event.createdAt,
      message: event.message,
      channelType: event.channelType,
      instanceName: event.instanceName,
      instanceType: event.instanceType,
      user: {
        displayName: event.user.displayName(),
        minecraft: mojang
          ? {
              id: mojang.id,
              name: mojang.name
            }
          : undefined,
        discord: discord
          ? {
              id: discord.id,
              displayName: discord.displayName
            }
          : undefined
      }
    }

    if ('replyUsername' in event) payload.replyUsername = event.replyUsername
    if ('channelId' in event) payload.channelId = event.channelId
    if ('guildRank' in event) payload.guildRank = event.guildRank
    if ('hypixelRank' in event) payload.hypixelRank = event.hypixelRank
    if ('rawMessage' in event) payload.rawMessage = event.rawMessage

    return payload
  }

  private sendJson(response: http.ServerResponse, status: number, body: Record<string, unknown>): void {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
  }

  private sendMethodNotAllowed(response: http.ServerResponse, allowed: string[]): void {
    response.setHeader('Allow', allowed.join(', '))
    this.sendJson(response, HttpStatusCode.MethodNotAllowed, { success: false, error: 'Method not allowed' })
  }

  private sendWebSocket(socket: WebSocket, message: WebSocketAckMessage): void {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(message))
  }

  private async readBody(request: http.IncomingMessage): Promise<string> {
    request.setEncoding('utf8')
    return await new Promise((resolve, reject) => {
      let body = ''
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        resolve(body)
      })
      request.on('error', reject)
    })
  }

  private shutdown(): void {
    for (const socket of this.connections) {
      socket.close()
    }
    this.connections.clear()
    this.wsServer.close()
    this.httpServer.close()
  }
}
