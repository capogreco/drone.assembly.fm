import { Knob } from "/ctrl/etc/knob.js"

export class Knobs {
   constructor () {
      this.m = []

      const w = (globalThis.innerWidth / 2) - 400
      const h = (globalThis.innerHeight / 2) - 150

      for (let j = 0; j < 3; j++) {
         for (let i = 0; i < 8; i++) {
            this.m.push (
               new Knob ({ x: i * 100 + w, y: j * 100 + h },
               100, 8 + i + (j * 8), 64)
            )
         }   
      }


   }

   reposition () {
      const w = (globalThis.innerWidth / 2) - 400
      const h = (globalThis.innerHeight / 2) - 150

      this.m.forEach ((k, ind) => {
         const i = ind % 8
         const j = Math.floor (ind / 8)
         k.reposition ({ x: i * 100 + w, y: j * 100 + h })
      })
   }
}

// export const knobs = []
// const w = (globalThis.innerWidth / 2) - 400
// const h = (globalThis.innerHeight / 2) - 150

// for (let j = 0; j < 3; j++) {
//    for (let i = 0; i < 8; i++) {
//       knobs.push (
//          new Knob ({ x: i * 100 + w, y: j * 100 + h },
//          100, 8 + i + (j * 8), 0)
//       )
//    }   
// }
