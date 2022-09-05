<template>
  <router-view />
</template>

<script setup lang="ts">
import { HOPP_MODULES } from '@modules/.';

// Run module root component setup code
HOPP_MODULES.forEach((mod) => mod.onRootSetup?.())
</script>
