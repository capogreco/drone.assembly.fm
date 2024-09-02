const random_bi = () => Math.random () * 2 - 1

const voices = {
   index: 0,
   total: 1
}

export const init_audio = async a => {
   // a.test = `the test is working`

   a.ctx = await new AudioContext ()
   if (a.ctx.state === `suspended`) await a.ctx.resume ()

   a.timbre = Array (6).fill (0).map (() => {
      const osc = a.ctx.createOscillator ()
      osc.frequency.value = 8000 * Math.pow (2, random_bi ()) 
      osc.start ()

      const amp = a.ctx.createGain ()
      amp.gain.value = 0

      return { osc, amp }
   }) 

   a.timbre.forEach ((o, i) => {
      o.osc.connect (o.amp)
      if (i !== 0) {
         o.amp.connect (a.timbre[i - 1].osc.frequency)
      }
   })

   a.osc = a.ctx.createOscillator ()
   a.osc.frequency.value = 8000 * Math.pow (2, random_bi ()) 
   a.osc.start ()

   a.vibrato = {}
   a.vibrato.osc = a.ctx.createOscillator ()
   a.vibrato.osc.frequency.value = 1
   a.vibrato.osc.start ()

   a.vibrato.wid = a.ctx.createGain ()
   a.vibrato.wid.gain.value = 0

   a.vibrato.osc.connect (a.vibrato.wid)
      .connect (a.osc.frequency)

   a.timbre[0].amp.connect (a.osc.frequency)

   a.tremolo = {}
   a.tremolo.osc = a.ctx.createOscillator ()
   a.tremolo.osc.frequency.value = 1
   a.tremolo.osc.start ()

   a.tremolo.wid = a.ctx.createGain ()
   a.tremolo.wid.gain.value = 0

   a.tremolo.amp = a.ctx.createGain ()
   a.tremolo.amp.gain.value = 0
   a.tremolo.osc
      .connect (a.tremolo.wid)
      .connect (a.tremolo.amp.gain)

   a.tremolo.off = a.ctx.createConstantSource ()
   a.tremolo.off.offset.value = 1
   a.tremolo.off.connect (a.tremolo.amp.gain)
   a.tremolo.off.start ()

   a.pan = a.ctx.createStereoPanner ()
   if (voices.total === 1) {
      a.pan.pan.value = 0
   } else {
      const pan_val = (voices.index / (voices.total - 1)) * 2 - 1
      a.pan.pan.value = pan_val
   }

   a.amp = a.ctx.createGain ()
   a.amp.gain.value = 0
   a.osc.connect (a.tremolo.amp)
      .connect (a.amp)
      .connect (a.pan)
      .connect (a.ctx.destination)

   a.rev = a.ctx.createConvolver ()
   const response = await fetch (`etc/R1NuclearReactorHall.m4a`)
   const array_buffer = await response.arrayBuffer ()
   const audio_buffer = await a.ctx.decodeAudioData (array_buffer)
   a.rev.buffer = audio_buffer

   a.wet = a.ctx.createGain ()
   a.wet.gain.value = 0
   a.amp.connect (a.wet)
      .connect (a.rev)
      .connect (a.ctx.destination)         
   


}