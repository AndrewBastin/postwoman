import { HoppModule } from "."
import NProgress from "nprogress"

export const startPageProgress = () => {
  NProgress.start()
}

export const completePageProgress = () => {
  NProgress.done()
}

export const removePageProgress = () => {
  NProgress.remove()
}

export default <HoppModule>{
  onVueAppInit() {
    NProgress.configure({ showSpinner: false })
  },
  onBeforeRouteChange(to, from) {
    // Show progressbar on page change
    if (to.path !== from.path) {
      startPageProgress()
    }
  },
  onAfterRouteChange() {
    completePageProgress()
  },
}
