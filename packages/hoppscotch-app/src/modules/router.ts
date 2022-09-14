import { HoppModule, HOPP_MODULES } from "."
import { createRouter, createWebHistory } from "vue-router"
import { setupLayouts } from "virtual:generated-layouts"
import generatedRoutes from "virtual:generated-pages"
import { logPageView } from "~/helpers/fb/analytics"
import { completePageProgress, startPageProgress } from "./loadingbar"

const routes = setupLayouts(generatedRoutes)

export default <HoppModule>{
  onVueAppInit(app) {
    const router = createRouter({
      history: createWebHistory(),
      routes,
    })

    router.beforeEach((to, from) => {
      HOPP_MODULES.forEach((mod) => {
        mod.onBeforeRouteChange?.(to, from, router)
      })
    })

    // Instead of this a better architecture is for the router
    // module to expose a stream of router events that can be independently
    // subbed to
    router.afterEach((to) => {
      logPageView(to.fullPath)

      HOPP_MODULES.forEach((mod) => {
        mod.onAfterRouteChange?.(to, router)
      })
    })

    app.use(router)
  },
}
