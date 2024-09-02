import { Knobs } from "./etc/knobs.js"
import { ParameterIndicator } from "./etc/parameter_indicator.js"
import { IsPlayingIndicator } from "./etc/is_playing_indicator.js"
import { UpdateMessage } from "./etc/update_message.js"

document.body.style.background = `darkmagenta` 
document.body.style.overflow = `hidden`
document.body.style.margin = 0

const knobs = new Knobs ()
const values = Array (24).fill (64)
const param_indicator = new ParameterIndicator ()
const is_playing_indicator = new IsPlayingIndicator (60, false)
const update_msg = new UpdateMessage ()

globalThis.onresize = () => {
   knobs.reposition ()
   is_playing_indicator.reposition ()
   update_msg.reposition ()
}

const midi_handler = e => {
   const [status, control, value] = e.data
   if (status === 176) {
      values[control - 8] = value
      knobs.m[control - 8].update (value)
      param_indicator.trigger (control, value, values)
   }
}

const init_midi = async () => {
   const midi = await navigator.requestMIDIAccess ()
   midi.inputs.forEach (device => {
      device.onmidimessage = midi_handler
   })

   midi.onstatechange = e => {
      const port_exists = e.port instanceof MIDIInput
      const port_connected = e.port.state === `connected`
      if (port_exists && port_connected) {
         e.port.onmidimessage = midi_handler
      }
   }
}

init_midi ()

const update = () => {

   fetch (`/api/update`, {
      method: `POST`,
      headers: {
         "Content-Type": `application/json`
      },
      body: JSON.stringify ({
         type: `update`,
         values,
         is_playing
      })
   })

   update_msg.trigger ()
}

const manage_bank = key => {
   const type = save_mode ? `save` : `load`
   console.log (`${ type } ${ key }`)

   const payload = {
      key: key,
      values,
      type,
   }

   const json = JSON.stringify (payload)

   console.log (json)

   // fetch (`/api/bank`, {
   //    method: `POST`,
   //    headers: {
   //       "Content-Type": `application/json`
   //    },
   //    body: json
   // })
}

let save_mode = false
let is_playing = false


const toggle_play = () => {
   is_playing = !is_playing
   is_playing_indicator.update (is_playing)
}

globalThis.onkeydown = e => {
   const { key } = e
   const key_handler = {
      Enter: () => update (),
      p: toggle_play,
      s: () => { save_mode = true },
      0: manage_bank,
      1: manage_bank,
      2: manage_bank,
      3: manage_bank,
      4: manage_bank,
      5: manage_bank,
      6: manage_bank,
      7: manage_bank,
      8: manage_bank,
      9: manage_bank,
   }

   let safe = false
   for (const k in key_handler) {
      if (key === k) {
         safe = true
         break
      }
   }

   if (!safe) return

   key_handler[key](key)

}
