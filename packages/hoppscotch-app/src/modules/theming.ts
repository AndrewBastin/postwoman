import { usePreferredDark, useStorage } from "@vueuse/core"
import { App, computed, reactive, Ref, watch } from "vue"
import type { HoppBgColor } from "~/newstore/settings"
import { useSettingStatic } from "@composables/settings"
import { HoppModule } from "~/types"


export type HoppColorMode = {
  preference: HoppBgColor
  value: Readonly<Exclude<HoppBgColor, "system">>
}

const applyColorMode = (app: App) => {
  const [settingPref] = useSettingStatic("BG_COLOR")

  const currentLocalPreference = useStorage<HoppBgColor>("nuxt-color-mode", "system", localStorage, {
    listenToStorageChanges: true,
  })

  const systemPrefersDark = usePreferredDark()

  const selection = computed<Exclude<HoppBgColor, "system">>(() => {
    if (currentLocalPreference.value === "system") {
      return systemPrefersDark.value ? "dark" : "light"
    } else return currentLocalPreference.value
  })

  watch(selection, (newSelection) => {
    document.documentElement.setAttribute("class", newSelection)
  }, { immediate: true })

  watch(settingPref, (newPref) => {
    currentLocalPreference.value = newPref
  }, { immediate: true })

  const exposed: HoppColorMode = reactive({
    preference: currentLocalPreference,
    // Marking as readonly to not allow writes to this ref
    value: selection as Readonly<Ref<Exclude<HoppBgColor, "system">>>
  })

  app.provide("colorMode", exposed)
}

const applyAccentColor = (app: App) => {
  const [pref] = useSettingStatic("THEME_COLOR")

  watch(pref, (newPref) => {
    document.documentElement.setAttribute("data-accent", newPref)
  }, { immediate: true })
}

const applyFontSize = (app: App) => {
  const [pref] = useSettingStatic("FONT_SIZE")

  watch(pref, (newPref) => {
    document.documentElement.setAttribute("data-font-size", newPref)
  }, { immediate: true })
}

/**
 * A rough emulation of the Nuxt Color Mode API features we use
 */
export const colorMode: HoppModule = ({ app }) => {
  applyColorMode(app)
  applyAccentColor(app)
  applyFontSize(app)
}

export default colorMode