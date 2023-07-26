import {Server, Socket} from "socket.io"
import {ExtendedError} from "socket.io/dist/namespace"
import Application from "../../Application"
import {BaseEvent} from "../../common/ApplicationEvent";
import {Logger} from "log4js";

export default class ServerSocket {
    private readonly server: Server
    private readonly key: string

    constructor(app: Application, logger: Logger, port: number, key: string) {
        this.key = key
        this.server = new Server({transports: ["websocket"]})
        this.server.listen(port)
        this.server.use((socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
            if (socket.handshake.auth.key === this.key) return next()

            logger.warn(`Socket Server has received`
                + ` an authorized connection request from socket ${socket.id}.`)
            return next(new Error("invalid key"))
        })

        app.on("*", (name, ...args) => {
            let event: BaseEvent = args[0]
            if (event.localEvent) {
                this.server.emit(name, ...args)
            }
        })

        this.server.on('connection', (socket) => {
            logger.debug('New Socket connection.')
            app.broadcastLocalInstances()

            socket.onAny((name, ...args) => {
                let event: BaseEvent = args[0]
                event.localEvent = false
                app.emit(name, ...args)

                for (let [id, s] of this.server.sockets.sockets.entries()) {
                    if (id !== socket?.id) s.emit(name, ...args)
                }
            })
        })
    }

    public shutdown() {
        this.server.close()
    }
}
