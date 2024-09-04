const random_bi = () => Math.random () * 2 - 1
const midi_to_freq = n => 440 * Math.pow (2, (n - 69) / 12)
const rand_element = a => a[Math.floor (Math.random () * a.length)]
const rand_int = n => Math.floor (Math.random () * n) + 1

const siq_gen = (num, den, unity) => {
   const num_min = Math.floor (unity * num) + 1
   const num_array = []
   for (let i = num_min; i <= num; i++) num_array.push (i)

   const den_min = Math.floor (unity * den) + 1
   const den_array = []
   for (let i = den_min; i <= den; i++) den_array.push (i)   
   return [ num_array, den_array ]
}


export const update_graph = async (program, g) => {
   const voices = { index: 0, total: 1 }

   console.dir (program)

   const lag_diversity = program.values[23] / 127
   const lag = Math.pow (program.values[15] / 127, 3) * 40
   const lag_time = lag * Math.pow (2, lag_diversity * random_bi ())

   console.log (lag_diversity, lag, lag_time)

   if (g.ctx === undefined) return
   const t = g.ctx.currentTime

   if (g.amp === undefined) return
   if (!program.is_playing) {
      g.amp.gain.cancelScheduledValues (t)
      g.amp.gain.setValueAtTime (g.amp.gain.value, t)
      g.amp.gain.exponentialRampToValueAtTime (0.001, t + lag_time)
      g.amp.gain.linearRampToValueAtTime (0, t + lag_time + 0.02)
      return
   }

   if (g.osc === undefined) return
   g.osc.frequency.cancelScheduledValues (t)
   g.osc.frequency.setValueAtTime (g.osc.frequency.value, t)

   const fine_tune = program.values[8] * 0.0157480315 - 1
   const detune = random_bi () * program.values[16] / 128
   const freq = midi_to_freq (program.values[0] + fine_tune + detune)

   const num = Math.floor (program.values[1] * 11 / 127) + 1 // [1, 12]
   const den = Math.floor (program.values[9] * 11 / 127) + 1 // [1, 12]
   const unity = program.values[17] / 128 // [0, 1)

   const [ num_array, den_array ] = siq_gen (num, den, unity)

   const harm = freq * rand_element (num_array) / rand_element (den_array)
   g.osc.frequency.exponentialRampToValueAtTime (harm, t + lag_time)

   if (g.pan === undefined) return

   if (g.vibrato.wid === undefined) return
   const vib_wid = Math.pow (program.values[3] / 127, 4) * harm * 0.5
   g.vibrato.wid.gain.cancelScheduledValues (t)
   g.vibrato.wid.gain.setValueAtTime (g.vibrato.wid.gain.value, t)
   g.vibrato.wid.gain.linearRampToValueAtTime (vib_wid, t + lag_time)

   if (g.vibrato.osc === undefined) return
   const vib_freq = 0.05 * Math.pow (320, program.values[11] / 127)
   const vib_div = program.values[19] / 127
   const vib_mul = rand_int (vib_div * 12) / rand_int (vib_div * 12)

   g.vibrato.osc.frequency.cancelScheduledValues (t)
   g.vibrato.osc.frequency.setValueAtTime (g.vibrato.osc.frequency.value, t)
   g.vibrato.osc.frequency.exponentialRampToValueAtTime (vib_freq * vib_mul, t + lag_time)

   let t_harm = harm

   const t_dmp = program.values[5] / 127
   const t_amt = program.values[13] / 127
   const t_div = Math.random () * program.values[21] / 127

   for (let i = 0; i < 6; i++) {
      if (g.timbre[i].osc === undefined) return
      g.timbre[i].osc.frequency.cancelScheduledValues (t)
      g.timbre[i].osc.frequency.setValueAtTime (g.timbre[i].osc.frequency.value, t)

      const t_num = Math.floor (program.values[4] * 11 / 127) + 1 // [1, 12]
      const t_den = Math.floor (program.values[12] * 11 / 127) + 1 // [1, 12]
      const t_unity = program.values[20] / 128 // [0, 1)
   
      const [ t_num_array, t_den_array ] = siq_gen (t_num, t_den, t_unity)
      t_harm = t_harm * rand_element (t_num_array) / rand_element (t_den_array)
      while (t_harm > 16000) t_harm /= 2
      while (t_harm < 32) t_harm *= 2
      g.timbre[i].osc.frequency.exponentialRampToValueAtTime (t_harm, t + lag_time)

      if (g.timbre[i].amp === undefined) return
      g.timbre[i].amp.gain.cancelScheduledValues (t)
      g.timbre[i].amp.gain.setValueAtTime (g.timbre[i].amp.gain.value, t)
      const t_vol = t_harm * t_amt * (1 - t_div) / ((i * t_dmp) + 1)
      g.timbre[i].amp.gain.linearRampToValueAtTime (t_vol, t + lag_time)
   }

   if (g.tremolo.off === undefined ) return
   if (g.tremolo.wid === undefined) return
   const trem_val = program.values[2] / 254
   g.tremolo.off.offset.cancelScheduledValues (t)
   g.tremolo.wid.gain.cancelScheduledValues (t)
   g.tremolo.off.offset.setValueAtTime (g.tremolo.off.offset.value, t)
   g.tremolo.wid.gain.setValueAtTime   (g.tremolo.wid.gain.value, t)
   g.tremolo.off.offset.linearRampToValueAtTime (1 - trem_val, t + lag_time)
   g.tremolo.wid.gain.linearRampToValueAtTime (trem_val, t + lag_time)

   const trem_div = program.values[18] / 127
   const trem_mul = rand_int (trem_div * 12) / rand_int (trem_div * 12)

   if (g.tremolo.osc === undefined) return
   const trem_freq = 0.05 * Math.pow (320, program.values[10] / 127)

   if (g.tremolo.osc === undefined) return
   g.tremolo.osc.frequency.cancelScheduledValues (t)
   g.tremolo.osc.frequency.setValueAtTime (g.tremolo.osc.frequency.value, t)
   g.tremolo.osc.frequency.exponentialRampToValueAtTime (trem_freq * trem_mul, t + lag_time)

   const vol = program.values[7] / (127 * voices.total)
   g.amp.gain.cancelScheduledValues (t)
   g.amp.gain.setValueAtTime (g.amp.gain.value, t)
   g.amp.gain.linearRampToValueAtTime (vol, t + lag_time)

   if (g.rev === undefined || g.wet === undefined) return

   const rev_diversity = 1 - (Math.random () * program.values[22] / 127)

   const rev_vol = program.values[14] * rev_diversity / 127
   g.wet.gain.cancelScheduledValues (t)
   g.wet.gain.setValueAtTime (g.wet.gain.value, t)
   g.wet.gain.linearRampToValueAtTime (rev_vol, t + lag_time)
}   
