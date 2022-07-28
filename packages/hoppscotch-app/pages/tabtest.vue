<template>
  <div>
    <button @click="hasTabA = !hasTabA">Tab A Toggle</button>
    <button @click="hasTabB = !hasTabB">Tab B Toggle</button>
    <button @click="hasTabC = !hasTabC">Tab C Toggle</button>
    <br />
    <SmartTabs v-model="currentTab">
      <SmartTab v-if="hasTabA" :id="'tab-a'" :label="`Tab A`">
        This is Tab A
      </SmartTab>
      <SmartTab v-if="hasTabB" :id="'tab-b'" :label="`Tab B`">
        This is Tab B
      </SmartTab>
      <SmartTab v-if="hasTabC" :id="'tab-c'" :label="`Tab C`">
        This is Tab C
      </SmartTab>
    </SmartTabs>
  </div>
</template>

<script setup lang="ts">
import { ref, defineComponent } from "@nuxtjs/composition-api"
const currentTab = ref("tab-a")
const hasTabA = ref(true)
const hasTabB = ref(true)
const hasTabC = ref(true)
</script>

<script lang="ts">
export default defineComponent({
  layout: "default",
})
</script>
