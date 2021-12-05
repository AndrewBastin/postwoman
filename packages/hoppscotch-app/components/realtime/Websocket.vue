<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && windowInnerWidth.x.value >= 768"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && windowInnerWidth.x.value >= 768,
    }"
    :horizontal="!(windowInnerWidth.x.value >= 768)"
  >
    <Pane size="75" min-size="65" class="hide-scrollbar !overflow-auto">
      <Splitpanes class="smart-splitter" :horizontal="COLUMN_LAYOUT">
        <Pane
          :size="COLUMN_LAYOUT ? 45 : 50"
          class="hide-scrollbar !overflow-auto"
        >
          <AppSection label="request">
            <div class="bg-primary flex p-4 top-0 z-10 sticky">
              <div class="space-x-2 flex-1 inline-flex">
                <input
                  id="websocket-url"
                  v-model="url"
                  class="bg-primaryLight border border-divider rounded text-secondaryDark w-full py-2 px-4 hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
                  type="url"
                  autocomplete="off"
                  spellcheck="false"
                  :class="{ error: !urlValid }"
                  :placeholder="t('websocket.url').toString()"
                  :disabled="connectionState"
                  @keyup.enter="urlValid ? toggleConnection() : null"
                />
                <ButtonPrimary
                  id="connect"
                  :disabled="!urlValid"
                  class="w-32"
                  name="connect"
                  :label="
                    !connectionState
                      ? t('action.connect').toString()
                      : t('action.disconnect').toString()
                  "
                  :loading="connectingState"
                  @click.native="toggleConnection"
                />
              </div>
            </div>
            <div
              class="bg-primary border-b border-dividerLight flex flex-1 top-upperPrimaryStickyFold pl-4 z-10 sticky items-center justify-between"
            >
              <label class="font-semibold text-secondaryLight">
                {{ $t("websocket.protocols") }}
              </label>
              <div class="flex">
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.clear_all').toString()"
                  svg="trash-2"
                  @click.native="clearContent"
                />
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('add.new').toString()"
                  svg="plus"
                  @click.native="addProtocol"
                />
              </div>
            </div>
            <div
              v-for="(protocol, index) of protocols"
              :key="`protocol-${index}`"
              class="divide-dividerLight divide-x border-b border-dividerLight flex"
            >
              <input
                v-model="protocol.value"
                class="bg-transparent flex flex-1 py-2 px-4"
                :placeholder="
                  t('count.protocol', { count: index + 1 }).toString()
                "
                name="message"
                type="text"
                autocomplete="off"
                @change="
                  updateProtocol(index, {
                    value: $event.target.value,
                    active: protocol.active,
                  })
                "
              />
              <span>
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="
                    protocol.hasOwnProperty('active')
                      ? protocol.active
                        ? t('action.turn_off').toString()
                        : t('action.turn_on').toString()
                      : t('action.turn_off').toString()
                  "
                  :svg="
                    protocol.hasOwnProperty('active')
                      ? protocol.active
                        ? 'check-circle'
                        : 'circle'
                      : 'check-circle'
                  "
                  color="green"
                  @click.native="
                    updateProtocol(index, {
                      value: protocol.value,
                      active: !protocol.active,
                    })
                  "
                />
              </span>
              <span>
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.remove').toString()"
                  svg="trash"
                  color="red"
                  @click.native="deleteProtocol({ index })"
                />
              </span>
            </div>
            <div
              v-if="protocols.length === 0"
              class="flex flex-col text-secondaryLight p-4 items-center justify-center"
            >
              <img
                :src="`/images/states/${$colorMode.value}/add_category.svg`"
                loading="lazy"
                class="flex-col object-contain object-center h-16 my-4 w-16 inline-flex"
                :alt="$t('empty.protocols')"
              />
              <span class="text-center mb-4">
                {{ $t("empty.protocols") }}
              </span>
            </div>
          </AppSection>
        </Pane>
        <Pane
          :size="COLUMN_LAYOUT ? 65 : 50"
          class="hide-scrollbar !overflow-auto"
        >
          <AppSection label="response">
            <RealtimeLog :title="t('websocket.log').toString()" :log="log" />
          </AppSection>
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto"
    >
      <AppSection label="messages">
        <div class="flex flex-col flex-1 p-4 inline-flex">
          <label
            for="websocket-message"
            class="font-semibold text-secondaryLight"
          >
            {{ t("websocket.communication").toString() }}
          </label>
        </div>
        <div class="flex space-x-2 px-4">
          <input
            id="websocket-message"
            v-model="communication.input"
            name="message"
            type="text"
            autocomplete="off"
            :disabled="!connectionState"
            :placeholder="t('websocket.message').toString()"
            class="input"
            @keyup.enter="connectionState ? sendMessage() : null"
            @keyup.up="connectionState ? walkHistory('up') : null"
            @keyup.down="connectionState ? walkHistory('down') : null"
          />
          <ButtonPrimary
            id="send"
            name="send"
            :disabled="!connectionState"
            :label="t('action.send').toString()"
            @click.native="sendMessage"
          />
        </div>
      </AppSection>
    </Pane>
  </Splitpanes>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
} from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import debounce from "lodash/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import useWindowSize from "~/helpers/utils/useWindowSize"
import { useSetting } from "~/newstore/settings"
import {
  setWSEndpoint,
  WSEndpoint$,
  WSProtocols$,
  setWSProtocols,
  addWSProtocol,
  deleteWSProtocol,
  updateWSProtocol,
  deleteAllWSProtocols,
  WSSocket$,
  setWSSocket,
  setWSConnectionState,
  setWSConnectingState,
  WSConnectionState$,
  WSConnectingState$,
  addWSLogLine,
  WSLog$,
  setWSLog,
  HoppWSProtocol,
} from "~/newstore/WebSocketSession"
import {
  useI18n,
  useStream,
  useToast,
  useColorMode,
  useWorker,
} from "~/helpers/utils/composables"

const t = useI18n()
const $worker = useWorker()
const $toast = useToast()
const $colorMode = useColorMode()

const windowInnerWidth = useWindowSize()
const SIDEBAR = useSetting("SIDEBAR")
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const url = useStream(WSEndpoint$, "", setWSEndpoint)
const protocols = useStream(WSProtocols$, [], setWSProtocols)
const connectionState = useStream(
  WSConnectionState$,
  false,
  setWSConnectionState
)
const connectingState = useStream(
  WSConnectingState$,
  false,
  setWSConnectingState
)
const socket = useStream(WSSocket$, null, setWSSocket)
const log = useStream(WSLog$, [], setWSLog)

const isUrlValid = ref(true)
const communication = reactive({
  input: "",
})
const currentIndex = ref(-1)
const activeProtocols = ref([] as string[])

const urlValid = computed(() => isUrlValid.value)

watch(
  protocols,
  (newVal) => {
    activeProtocols.value = newVal
      .filter((item) =>
        Object.prototype.hasOwnProperty.call(item, "active")
          ? item.active === true
          : true
      )
      .map(({ value }) => value)
  },
  { deep: true }
)

onBeforeUnmount(() => {
  worker.terminate()
})

const clearContent = () => {
  deleteAllWSProtocols()
}

const workerResponseHandler = ({
  data,
}: {
  data: { url: string; result: boolean }
}) => {
  if (data.url === url.value) isUrlValid.value = data.result
}

const worker = $worker.createRejexWorker()
worker.addEventListener("message", workerResponseHandler)

const debouncer = debounce(function () {
  worker.postMessage({ type: "ws", url: url.value })
}, 1000)

watch(url, () => {
  debouncer()
})

const toggleConnection = () => {
  if (!connectionState.value) return connect()
  else return disconnect()
}

const connect = () => {
  log.value = [
    {
      payload: t("state.connecting_to", { name: url.value }).toString(),
      source: "info",
      color: "var(--accent-color)",
      ts: new Date().toLocaleTimeString(),
    },
  ]
  try {
    connectingState.value = true
    socket.value = new WebSocket(url.value, activeProtocols.value)
    socket.value.onopen = () => {
      connectingState.value = false
      connectionState.value = true
      log.value = [
        {
          payload: t("state.connected_to", { name: url.value }).toString(),
          source: "info",
          color: "var(--accent-color)",
          ts: new Date().toLocaleTimeString(),
        },
      ]

      $toast.success(t("state.connected").toString())
    }
    socket.value.onerror = () => {
      handleError()
    }
    socket.value.onclose = () => {
      connectionState.value = false
      addWSLogLine({
        payload: t("state.disconnected_from", { name: url.value }).toString(),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })

      $toast.error(t("state.disconnected").toString())
    }
    socket.value.onmessage = ({ data }) => {
      addWSLogLine({
        payload: data as string,
        source: "server",
        ts: new Date().toLocaleTimeString(),
      })
    }
  } catch (e: any) {
    handleError(e)
    $toast.error(t("error.something_went_wrong").toString())
  }

  logHoppRequestRunToAnalytics({
    platform: "wss",
  })
}

const disconnect = () => {
  if (socket.value) {
    socket.value.close()
    connectionState.value = false
    connectingState.value = false
  }
}

const handleError = (error?: any) => {
  disconnect()
  connectionState.value = false
  addWSLogLine({
    payload: t("error.something_went_wrong").toString(),
    source: "info",
    color: "#ff5555",
    ts: new Date().toLocaleTimeString(),
  })
  if (error)
    addWSLogLine({
      payload: error,
      source: "info",
      color: "#ff5555",
      ts: new Date().toLocaleTimeString(),
    })
}

const sendMessage = () => {
  if (!socket.value) return

  const message = communication.input

  socket.value.send(message)

  addWSLogLine({
    payload: message,
    source: "client",
    ts: new Date().toLocaleTimeString(),
  })

  communication.input = ""
}

const walkHistory = (direction: "up" | "down") => {
  const clientMessages = log.value.filter(({ source }) => source === "client")

  const length = clientMessages.length

  switch (direction) {
    case "up":
      if (length > 0 && currentIndex.value !== 0) {
        // does nothing if message log is empty or the currentIndex is 0 when up arrow is pressed
        if (currentIndex.value === -1) {
          currentIndex.value = length - 1
          communication.input = clientMessages[currentIndex.value].payload
        } else if (currentIndex.value === 0) {
          communication.input = clientMessages[0].payload
        } else if (currentIndex.value > 0) {
          currentIndex.value = currentIndex.value - 1
          communication.input = clientMessages[currentIndex.value].payload
        }
      }
      break
    case "down":
      if (length > 0 && currentIndex.value > -1) {
        if (currentIndex.value === length - 1) {
          currentIndex.value = -1
          communication.input = ""
        } else if (currentIndex.value < length - 1) {
          currentIndex.value = currentIndex.value + 1
          communication.input = clientMessages[currentIndex.value].payload
        }
      }
      break
  }
}
const addProtocol = () => {
  addWSProtocol({ value: "", active: true })
}

const deleteProtocol = ({ index }: { index: number }) => {
  const oldProtocols = protocols.value.slice()
  deleteWSProtocol(index)
  $toast.success(t("state.deleted").toString(), {
    duration: 4000,
    action: {
      text: t("action.undo").toString(),
      onClick: (_, toastObject) => {
        protocols.value = oldProtocols
        toastObject.goAway()
      },
    },
  })
}

const updateProtocol = (index: number, updated: HoppWSProtocol) => {
  updateWSProtocol(index, updated)
}
</script>
