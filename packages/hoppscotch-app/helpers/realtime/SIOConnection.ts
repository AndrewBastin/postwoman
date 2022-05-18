import { BehaviorSubject, Subject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"
import { SIOClientV2, SIOClientV3, SIOClientV4, SIOClient } from "./SIOClients"
import { SIOClientVersion } from "~/newstore/SocketIOSession"

export const SocketClients = {
  v2: SIOClientV2,
  v3: SIOClientV3,
  v4: SIOClientV4,
}

type SIOAuth = { type: "None" } | { type: "Bearer"; token: string }

export type SIOMessage = {
  event: string
  message: unknown
}

export type ConnectionOption = {
  url: string
  path: string
  clientVersion: SIOClientVersion
  auth: SIOAuth | undefined
}

export type SIOEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "MESSAGE_SENT"; message: SIOMessage }
  | { type: "MESSAGE_RECEIVED"; message: SIOMessage }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: string }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export class SIOConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  event$: Subject<SIOEvent>
  socket: SIOClient | undefined

  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
    this.event$ = new Subject()
  }

  private addEvent(event: SIOEvent) {
    this.event$.next(event)
  }

  connect({ url, path, clientVersion, auth }: ConnectionOption) {
    this.connectionState$.next("CONNECTING")
    this.addEvent({
      time: Date.now(),
      type: "CONNECTING",
    })
    try {
      this.socket = new SocketClients[clientVersion]()

      if (auth?.type === "Bearer") {
        this.socket.connect(url, {
          path,
          auth: {
            token: auth.token,
          },
        })
      } else {
        this.socket.connect(url)
      }

      this.socket.on("connect", () => {
        this.connectionState$.next("CONNECTED")
        this.addEvent({
          type: "CONNECTED",
          time: Date.now(),
        })
      })

      this.socket.on("*", ({ data }: { data: [string, unknown] }) => {
        const [event, message] = data

        this.addEvent({
          message: {
            event,
            message,
          },
          type: "MESSAGE_RECEIVED",
          time: Date.now(),
        })
      })

      this.socket.on("connect_error", (error: any) => {
        this.handleError(error)
      })

      this.socket.on("reconnect_error", (error: any) => {
        this.handleError(error)
      })

      this.socket.on("error", (error: any) => {
        this.handleError(error)
      })

      this.socket.on("disconnect", () => {
        this.connectionState$.next("DISCONNECTED")
        this.addEvent({
          type: "DISCONNECTED",
          time: Date.now(),
          manual: true,
        })
      })
    } catch (e) {
      this.handleError(e)
    }

    logHoppRequestRunToAnalytics({
      platform: "socketio",
    })
  }

  private handleError(error: any) {
    this.disconnect()
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error,
    })
  }

  sendMessage(msg: SIOMessage) {
    if (this.connectionState$.value === "DISCONNECTED") return
    const { message, event } = msg

    this.socket?.emit(event, message, (data: unknown) => {
      // receive response from server
      this.addEvent({
        time: Date.now(),
        type: "MESSAGE_RECEIVED",
        message: {
          event,
          message: data,
        },
      })
    })

    this.addEvent({
      time: Date.now(),
      type: "MESSAGE_SENT",
      message: {
        event,
        message,
      },
    })
  }

  disconnect() {
    this.socket?.close()
    this.connectionState$.next("DISCONNECTED")
  }
}
