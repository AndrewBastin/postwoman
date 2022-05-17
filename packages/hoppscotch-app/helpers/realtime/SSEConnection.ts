import { BehaviorSubject, Subject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"

export type SSEError =
  | { type: "BROWSER_NO_SSE_SUPPORT" }
  | { type: "UNKNOWN_ERROR"; error: unknown }

export type SSEEvent = { time: number } & (
  | { type: "STARTING" }
  | { type: "STARTED" }
  | { type: "MESSAGE_RECEIVED"; message: string }
  | { type: "STOPPED"; manual: boolean }
  | { type: "ERROR"; error: SSEError }
)

export type ConnectionState = "STARTING" | "STARTED" | "STOPPED"

export class SSEConnection {
  connectionState$: BehaviorSubject<ConnectionState>
  event$: Subject<SSEEvent>
  sse: EventSource | undefined

  constructor() {
    this.connectionState$ = new BehaviorSubject<ConnectionState>("STOPPED")
    this.event$ = new Subject()
  }

  private addEvent(event: SSEEvent) {
    this.event$.next(event)
  }

  start(url: string, eventType: string) {
    this.connectionState$.next("STARTING")

    this.addEvent({
      time: Date.now(),
      type: "STARTING",
    })

    if (typeof EventSource !== "undefined") {
      try {
        this.sse = new EventSource(url)

        this.sse.onopen = () => {
          this.connectionState$.next("STARTED")
          this.addEvent({
            type: "STARTED",
            time: Date.now(),
          })
        }

        this.sse.onerror = this.handleError

        this.sse.addEventListener(eventType, ({ data }) => {
          this.addEvent({
            type: "MESSAGE_RECEIVED",
            message: data,
            time: Date.now(),
          })
        })
      } catch (e) {
        this.handleError(e)
      }
    } else {
      this.addEvent({
        type: "ERROR",
        time: Date.now(),
        error: { type: "BROWSER_NO_SSE_SUPPORT" },
      })
    }

    logHoppRequestRunToAnalytics({
      platform: "sse",
    })
  }

  private handleError(error: unknown) {
    this.stop()

    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error: {
        type: "UNKNOWN_ERROR",
        error,
      },
    })
  }

  stop() {
    this.sse?.close()
    this.connectionState$.next("STOPPED")
    this.addEvent({
      type: "STOPPED",
      time: Date.now(),
      manual: true,
    })
  }
}
