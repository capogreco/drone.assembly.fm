const note_to_name = note => {
   const notes = `C -C#-D -D#-E -F -F#-G -G#-A -A#-B `.split (`-`)
   const octave = Math.floor (note / 12) - 1
   const name = notes[note % 12]
   return `${ name }${ octave }`
}

const siq_gen = (num, den, unity) => {
   const num_min = Math.floor (unity * num) + 1
   const num_array = []
   for (let i = num_min; i <= num; i++) num_array.push (i)

   const den_min = Math.floor (unity * den) + 1
   const den_array = []
   for (let i = den_min; i <= den; i++) den_array.push (i)   
   return [ num_array, den_array ]
}

export class ParameterIndicator {
   constructor () {
      this.div = document.createElement (`div`)

      Object.assign (this.div.style, {
         font: `italic bolder 40px monospace`,
         justifyContent: `left`,
         alignItems: `center`,
         userSelect: `none`,
         position: `fixed`,
         color: `white`,
         zIndex: 1,
         left: `40px`,
         top: `30px`,
      })

      document.body.appendChild (this.div)

      this.timeout_id = false
   }

   trigger (control, value, values) {
      if (this.timeout_id) clearTimeout (this.timeout_id)

      const handler = {
         // root
         8: v => `note: ${ note_to_name (v) }`,
         16: v => `finetune: ${ (v * 2 / 128 - 1).toFixed (2) }`,
         24: v => `detune: ${ (v / 127).toFixed (2) }`,
   
         // harmonic
         9: v => {
            const num_max = Math.floor (v * 11 / 127) + 1 
            const den_max = Math.floor (values[9] * 11 / 127) + 1
            const unity = values[17] / 128
   
            const [ num, den ] = siq_gen (num_max, den_max, unity)
   
            return `<div>
               numerator:  ${ num_max }
               <br />[ ${ num.join (`, `) } ] 
               <br />[ ${ den.join (`, `) } ] 
            </div>`
         },
         17: v => {
            const num_max = Math.floor (values[1] * 11 / 127) + 1 
            const den_max = Math.floor (v * 11 / 127) + 1
            const unity = values[17] / 128
   
            const [ num, den ] = siq_gen (num_max, den_max, unity)
   
            return `<div>
               denominator: ${ den_max }
               <br />[ ${ num.join (`, `) } ] 
               <br />[ ${ den.join (`, `) } ] 
            </div>`
         },
         25: v => {      
            const num_max = Math.floor (values[1] * 11 / 127) + 1 
            const den_max = Math.floor (values[9] * 11 / 127) + 1
            const unity = v / 128
   
            const [ num, den ] = siq_gen (num_max, den_max, unity)
   
            return `<div>
               unity: ${ unity.toFixed (2) }
               <br />[ ${ num.join (`, `) } ] 
               <br />[ ${ den.join (`, `) } ] 
            </div>`
         },
         
         // tremolo
         10: v => `tremolo depth: ${ (v / 127).toFixed (2) }`,
         18: v => `tremolo rate: ${ (0.05 * Math.pow (320, v / 127)).toFixed (2) }`,
         26: v => `tremolo diversity: ${ (v / 127).toFixed (2) }`,
   
         // vibrato
         11: v => `vibrato depth: ${ (v / 127).toFixed (2) }`,
         19: v => `vibrato rate: ${ (0.05 * Math.pow (320, v / 127)).toFixed (2) }`,
         27: v => `vibrato diversity: ${ (v / 127).toFixed (2) }`,
   
         // timbre
         12: v => {
            const num_max = Math.floor (v * 11 / 127) + 1 
            const den_max = Math.floor (values[12] * 11 / 127) + 1
            const unity = values[20] / 128
   
            const [ num, den ] = siq_gen (num_max, den_max, unity)
   
            return `<div>
               timbre numerator:  ${ num_max }
               <br />[ ${ num.join (`, `) } ] 
               <br />[ ${ den.join (`, `) } ] 
            </div>`
         },
         20: v => {
            const num_max = Math.floor (values[4] * 11 / 127) + 1 
            const den_max = Math.floor (v * 11 / 127) + 1
            const unity = values[20] / 128
   
            const [ num, den ] = siq_gen (num_max, den_max, unity)
   
            return `<div>
               timbre denominator: ${ den_max }
               <br />[ ${ num.join (`, `) } ] 
               <br />[ ${ den.join (`, `) } ] 
            </div>`
         },
         28: v => {      
            const num_max = Math.floor (values[4] * 11 / 127) + 1 
            const den_max = Math.floor (values[12] * 11 / 127) + 1
            const unity = v / 128
   
            const [ num, den ] = siq_gen (num_max, den_max, unity)
   
            return `<div>
               timbre unity: ${ unity.toFixed (2) }
               <br />[ ${ num.join (`, `) } ] 
               <br />[ ${ den.join (`, `) } ] 
            </div>`
         },
   
         13: v => `timbre damping: ${ (v / 127).toFixed (2) }`,
         21: v => `timbre amount: ${ (v / 127).toFixed (2) }`,
         29: v => `timbre diversity: ${ (v / 127).toFixed (2) }`,
   
         // reverb
         22: v => `reverb amount: ${ (v / 127).toFixed (2) }`,
         30: v => `reverb diversity: ${ (v / 127).toFixed (2) }`,
   
         // global
         15: v => `volume: ${ (v / 127).toFixed (2) }`,
         23: v => `lag: ${ (Math.pow (v / 127, 3) * 40).toFixed (2) }s`,
         31: v => `lag diversity: ${ (v / 127).toFixed (2) }`,
      }
   
      const is_handleable = control in handler

      const msg = is_handleable 
         ? handler[control](value) 
         : `cc ${ control } : ${ value }`
   
      this.div.innerHTML = msg
      this.timeout_id = setTimeout (() => this.clear (), 3000)
   }

   clear () {
      this.div.innerText = ``
   }
}