import { Knob } from "/ctrl/etc/knob.js"

document.body.style.background = `darkmagenta` 
document.body.style.overflow = `hidden`
document.body.style.margin = 0

const midi_handler = e => {
   const [status, control, value] = e.data
   if (status === 176) {
      console.log (control, value)
      // v[control - 8].value = Number (value)
      // param_change.value = true
      // param_control.value = control
      // param_value.value = value
      // clearTimeout (param_change_id)
      // param_change_id = setTimeout (() => param_change.value = false, 1500)
   }
}

const init_midi = async () => {
   const midi = await navigator.requestMIDIAccess ()
   midi.inputs.forEach (device => {
      device.onmidimessage = midi_handler
   })

   midi.onstatechange = e => {
      const midi_event = e 
      if (midi_event.port instanceof MIDIInput && midi_event.port.state === `connected`) {
         midi_event.port.onmidimessage = midi_handler
      }
   }
}

init_midi ()

const k = new Knob ({ x: 100, y: 100 }, 200, 8, 64)

document.body.onpointerdown = () => {
   fetch (`/api/update`, {
      method: `POST`,
      headers: {
         "Content-Type": `application/json`
      },
      body: JSON.stringify ({ message: "hihihi !!! 🚀🚀🚀 from ctrl"})
   })
}

