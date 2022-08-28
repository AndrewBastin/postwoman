import { HoppModule } from "~/types"
import VueTippy, { setDefaultProps } from "vue-tippy"

import "tippy.js/dist/tippy.css"
import "tippy.js/animations/scale-subtle.css"

const tippyModule: HoppModule = ({ app }) => {
  app.use(VueTippy)

  setDefaultProps({
    animation: "scale-subtle",
    allowHTML: false,
    animateFill: false,
    arrow: false,
    popperOptions: {
      modifiers: [
        {
          name: "preventOverflow",
          options: {
            boundariesElement: "window",
          },
        },
      ],
    },
  })
}

export default tippyModule
