import { div } from './etc/synth_splash.js'
import { init_audio } from './etc/init_audio.js'
import { cnv, ctx } from './etc/cnv.js'
import { get_wake_lock } from './etc/wake_lock.js'
import { update_graph } from "./etc/update_graph.js"
import { save_graph, load_graph } from "../ctrl/etc/bank.js"

document.body.style.background = `black` 
document.body.style.overflow = `hidden`
document.body.style.margin = 0

let is_enabled = false
const a = {}
const bank = Array (10).fill (false)

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

   console.log (payload)
   const { type } = payload

   const handler = {
      welcome: p => console.log (p.message),
      update: p => {
         if (!is_enabled) return
         update_graph (p, a)
      },
      save: p => {
         const { key } = p
         save_graph (key, bank, a)
      },
      load: p => {
         const { key, current_program, load_program } = p
         console.dir (p)
         const res = load_graph (key, bank, a, current_program)
         console.log (res)
         if (!res) {
            console.dir (current_program)
            const program = {
               values: load_program,
            }
            program.values[7]  = current_program[7]
            program.values[15] = current_program[15]
            program.values[23] = current_program[23]
            update_graph (program, a)
         }

      },
   }

   handler[type] (payload)

   console.dir (type)
}

// const payload = JSON.stringify ({
//    type: `load`,
//    key: e.data.key,
//    current_program: e.data.program,
//    load_program: value
// })
