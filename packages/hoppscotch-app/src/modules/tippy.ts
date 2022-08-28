import { HoppModule } from "~/types"
import VueTippy, { setDefaultProps, roundArrow } from "vue-tippy"

import 'tippy.js/dist/tippy.css'
import 'tippy.js/dist/svg-arrow.css'

const tippyModule: HoppModule = ({ app }) => {
  app.use(VueTippy)

  setDefaultProps({
    allowHTML: false,
    animateFill: false,
    arrow: roundArrow,
    popperOptions: {
      modifiers: [
        {
          name: "preventOverflow",
          options: {
            boundariesElement: "window"
          }
        }
      ]
    }
  })
}

export default tippyModule
