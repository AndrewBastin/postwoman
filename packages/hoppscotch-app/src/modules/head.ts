import { createHead, useHead } from "@vueuse/head"
import { HoppModule } from "."

export default <HoppModule>{
  onVueAppInit(app) {
    const head = createHead({
      title: "Hoppscotch",
      titleTemplate(title) {
        return (title === "Hoppscotch")
          ? title
          : `${title} • Hoppscotch`
      }
    })

    app.use(head)
  },

  onRootSetup() {
    // Load the defaults into the app
    useHead({})
  }
}
