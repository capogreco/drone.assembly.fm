export const save_graph = (key, bank, a) => {
   const timbre = a.timbre.map (o => {
      if (!o.osc || !o.amp) return { freq: 0, amp: 0 }
      return { freq: o.osc.frequency.value, amp: o.amp.gain.value }
   })
   bank[key] = {
      freq: a.osc.frequency.value,
      amp: a.amp.gain.value,
      rev: a.wet.gain.value,
      trem_freq: a.tremolo.osc.frequency.value,
      trem_wid:  a.tremolo.wid.gain.value,
      trem_off:  a.tremolo.off.offset.value,
      vib_freq:  a.vibrato.osc.frequency.value,
      vib_wid:   a.vibrato.wid.gain.value,
      timbre,
   }
}


const random_bi = () => Math.random () * 2 - 1
// const rand_element = a => a[Math.floor (Math.random () * a.length)]
// const midi_to_freq = n => 440 * Math.pow (2, (n - 69) / 12)


export const load_graph = (key, bank, a, program) => {

   const graph_values = bank[key]
   console.dir (graph_values)
   if (!graph_values) return false

   const voices = { index: 0, total: 1 }   
   const lag_diversity = program[23] / 127
   const lag = Math.pow (program[15] / 127, 3) * 40
   const lag_time = lag * Math.pow (2, lag_diversity * random_bi ())

   const vol = program[7] / (127 * voices.total)


   const t = a.ctx.currentTime

   a.amp.gain.cancelScheduledValues (t)
   a.amp.gain.setValueAtTime (a.amp.gain.value, t)
   a.amp.gain.linearRampToValueAtTime (vol, t + lag_time)

   a.osc.frequency.cancelScheduledValues (t)
   a.osc.frequency.setValueAtTime (a.osc.frequency.value, t)
   a.osc.frequency.exponentialRampToValueAtTime (graph_values.freq, t + lag_time)

   a.wet.gain.cancelScheduledValues (t)
   a.wet.gain.setValueAtTime (a.wet.gain.value, t)
   a.wet.gain.linearRampToValueAtTime (graph_values.rev, t + lag_time)

   a.tremolo.osc.frequency.cancelScheduledValues (t)
   a.tremolo.osc.frequency.setValueAtTime (a.tremolo.osc.frequency.value, t)
   a.tremolo.osc.frequency.exponentialRampToValueAtTime (graph_values.trem_freq, t + lag_time)

   a.tremolo.wid.gain.cancelScheduledValues (t)
   a.tremolo.wid.gain.setValueAtTime (a.tremolo.wid.gain.value, t)
   a.tremolo.wid.gain.linearRampToValueAtTime (graph_values.trem_wid, t + lag_time)

   a.tremolo.off.offset.cancelScheduledValues (t)
   a.tremolo.off.offset.setValueAtTime (a.tremolo.off.offset.value, t)
   a.tremolo.off.offset.linearRampToValueAtTime (graph_values.trem_off, t + lag_time)

   a.vibrato.osc.frequency.cancelScheduledValues (t)
   a.vibrato.osc.frequency.setValueAtTime (a.vibrato.osc.frequency.value, t)
   a.vibrato.osc.frequency.exponentialRampToValueAtTime (graph_values.vib_freq, t + lag_time)

   a.vibrato.wid.gain.cancelScheduledValues (t)
   a.vibrato.wid.gain.setValueAtTime (a.vibrato.wid.gain.value, t)
   a.vibrato.wid.gain.linearRampToValueAtTime (graph_values.vib_wid, t + lag_time)

   graph_values.timbre.forEach ((o, i) => {
      if (a.timbre[i].osc || a.timbre[i].amp) return
      a.timbre[i].osc.frequency.cancelScheduledValues (t)
      a.timbre[i].osc.frequency.setValueAtTime (a.timbre[i].osc.frequency.value, t)
      a.timbre[i].osc.frequency.exponentialRampToValueAtTime (o.freq, t + lag_time)

      a.timbre[i].amp.gain.cancelScheduledValues (t)
      a.timbre[i].amp.gain.setValueAtTime (a.timbre[i].amp.gain.value, t)
      a.timbre[i].amp.gain.linearRampToValueAtTime (o.amp, t + lag_time)
   })   

   return true
}
