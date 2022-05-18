import Paho, { ConnectionOptions } from "paho-mqtt"
import { BehaviorSubject, Subject } from "rxjs"
import { logHoppRequestRunToAnalytics } from "../fb/analytics"

export type MQTTMessage = { key: string; values: { [key: string]: string } }

export type MQTTEvent = { time: number } & (
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "MESSAGE_SENT"; message: MQTTMessage | string }
  | { type: "SUBSCRIBED"; topic: string }
  | { type: "SUBSCRIPTION_FAILED"; topic: string }
  | { type: "MESSAGE_RECEIVED"; message: MQTTMessage | string }
  | { type: "DISCONNECTED"; manual: boolean }
  | { type: "ERROR"; error: MQTTMessage | string }
)

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED"

export class MQTTConnection {
  private mqttclient: Paho.Client | undefined

  subscriptionState$ = new BehaviorSubject<boolean>(false)
  connectionState$ = new BehaviorSubject<ConnectionState>("DISCONNECTED")
  event$ = new Subject<MQTTEvent>()

  private manualDisconnect = false

  private addEvent(event: MQTTEvent) {
    this.event$.next(event)
  }

  connect(url: string, username: string, password: string) {
    try {
      this.connectionState$.next("CONNECTING")

      this.addEvent({
        time: Date.now(),
        type: "CONNECTING",
      })

      const parseUrl = new URL(url)
      this.mqttclient = new Paho.Client(
        `${parseUrl.hostname}${
          parseUrl.pathname !== "/" ? parseUrl.pathname : ""
        }`,
        parseUrl.port !== "" ? Number(parseUrl.port) : 8081,
        "hoppscotch"
      )
      const connectOptions: ConnectionOptions = {
        onSuccess: this.onConnectionSuccess.bind(this),
        onFailure: this.onConnectionFailure.bind(this),
        useSSL: parseUrl.protocol !== "ws:",
      }
      if (username !== "") {
        connectOptions.userName = username
      }
      if (password !== "") {
        connectOptions.password = password
      }
      this.mqttclient.connect(connectOptions)
      this.mqttclient.onConnectionLost = this.onConnectionLost.bind(this)
      this.mqttclient.onMessageArrived = this.onMessageArrived.bind(this)
    } catch (e) {
      this.handleError(e)
    }

    logHoppRequestRunToAnalytics({
      platform: "mqtt",
    })
  }

  onConnectionFailure() {
    this.connectionState$.next("DISCONNECTED")
    this.addEvent({
      time: Date.now(),
      type: "ERROR",
      error: "Connection failed",
    })
  }

  onConnectionSuccess() {
    this.connectionState$.next("CONNECTED")
    this.addEvent({
      type: "CONNECTED",
      time: Date.now(),
    })
  }

  onConnectionLost() {
    this.connectionState$.next("DISCONNECTED")
    if (this.manualDisconnect) {
      this.addEvent({
        time: Date.now(),
        type: "DISCONNECTED",
        manual: this.manualDisconnect,
      })
    } else {
      this.addEvent({
        time: Date.now(),
        type: "ERROR",
        error: "Connection lost",
      })
    }
    this.manualDisconnect = false
    this.subscriptionState$.next(false)
  }

  onMessageArrived(data: { payloadString: string; destinationName: string }) {
    console.log(data)
    const { payloadString, destinationName } = data
    this.addEvent({
      time: Date.now(),
      type: "MESSAGE_RECEIVED",
      message: {
        key: "state.message_received",
        values: {
          destinationName,
          payloadString,
        },
      },
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

  publish(topic: string, message: string) {
    if (this.connectionState$.value === "DISCONNECTED") return

    try {
      // it was publish
      this.mqttclient?.send(topic, message, 0, false)
      this.addEvent({
        time: Date.now(),
        type: "MESSAGE_SENT",
        message: {
          key: "state.published_message",
          values: {
            topic,
            message,
          },
        },
      })
    } catch (e) {
      this.addEvent({
        time: Date.now(),
        type: "ERROR",
        error: {
          key: "state.publish_error",
          values: {
            topic,
            message,
          },
        },
      })
    }
  }

  subscribe(topic: string) {
    try {
      this.mqttclient?.subscribe(topic, {
        onSuccess: this.usubSuccess.bind(this),
        onFailure: this.usubFailure.bind(this),
      })
    } catch (e) {
      this.addEvent({
        time: Date.now(),
        type: "ERROR",
        error: {
          key: "state.mqtt_subscription_failed",
          values: {
            topic,
          },
        },
      })
    }
  }

  usubSuccess() {
    this.subscriptionState$.next(!this.subscriptionState$.value)
    this.addEvent({
      time: Date.now(),
      type: "SUBSCRIBED",
      topic: "",
    })
  }

  usubFailure() {
    this.addEvent({
      time: Date.now(),
      type: "SUBSCRIPTION_FAILED",
      topic: "",
    })
  }

  unsubscribe(topic: string) {
    this.mqttclient?.unsubscribe(topic, {
      onSuccess: this.usubSuccess.bind(this),
      onFailure: this.usubFailure.bind(this),
    })
  }

  disconnect() {
    this.manualDisconnect = true
    this.mqttclient?.disconnect()
    this.connectionState$.next("DISCONNECTED")
  }
}