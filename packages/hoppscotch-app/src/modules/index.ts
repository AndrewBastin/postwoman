import { App } from "vue"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"

export type HoppModule = {
  /**
   * Define this function to get access to Vue App instance and augment
   * it (installing components, directives and plugins). Also useful for
   * early generic initializations. This function should be called first
   */
  onVueAppInit?: (app: App) => void

  /**
   * Called when the root component (App.vue) is running setup.
   * This function is generally called last in the lifecycle.
   * This function executes with a component setup context, so you can
   * run composables within this and it should just be scoped to the
   * root component
   */
  onRootSetup?: () => void
}

/**
 * All the modules Hoppscotch loads into the app
 */
export const HOPP_MODULES = pipe(
  import.meta.globEager("@modules/*.ts"),
  Object.values,
  A.map(({ default: defaultVal }) => defaultVal as HoppModule)
)

