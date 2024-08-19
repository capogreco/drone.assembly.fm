console.log (`hello from synth.js`)

const es = new EventSource (`/api/listen`)
es.onmessage = e => {
   console.dir (e.data)
}
