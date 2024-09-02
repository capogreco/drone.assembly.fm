import { div } from './etc/synth_splash.js'
import { init_audio } from './etc/init_audio.js'
import { cnv, ctx } from './etc/cnv.js'
import { get_wake_lock } from './etc/wake_lock.js'
import { update_graph } from "./etc/update_graph.js"

document.body.style.background = `black` 
document.body.style.overflow = `hidden`
document.body.style.margin = 0

let is_enabled = false
const a = {}

document.body.appendChild (div)

div.onpointerdown = async () => {
   if (is_enabled) return
   is_enabled = true

   div.remove ()

   await get_wake_lock ()
   await init_audio (a)

   document.body.appendChild (cnv)
   ctx.fillStyle = `purple`
   ctx.fillRect (0, 0, cnv.width, cnv.height)
}


const es = new EventSource (`/api/listen`)

es.onmessage = e => {
   const { data } = e
   const payload = JSON.parse (data)
   const { type } = payload

   const handler = {
      welcome: p => console.log (p.message),
      update: p => {
         if (!is_enabled) return
         update_graph (p, a)
      }
   }

   handler[type] (payload)

   console.dir (type)
}
