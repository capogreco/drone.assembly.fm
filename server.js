import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts"

Deno.serve (req => {
   // console.log (req)

   const { pathname } = new URL (req.url)

   if (pathname.startsWith ("/api/listen")) {
      const bc = new BroadcastChannel (`program_channel`)
      let timer_id = false
      const body = new ReadableStream ({
          start: async controller => {
            controller.enqueue (`retry: 1000\n\n`)

            bc.onmessage = e => {
               console.log (`broadcast message:`, e)
               controller.enqueue (`data: ${JSON.stringify (e.data)}\n\n`)
            }

            const queue_update = async () => {
               timer_id = false
   
               try {
                  const msg = `hiiii!! ${ new Date () }`
                  controller.enqueue (`data: ${ msg }\n\n`)
               }
   
               finally {
                  timer_id = setTimeout (queue_update, 1000)
               }
            }

            await queue_update ()
         },


         cancel () {
            bc.close ()
            if (timer_id) {
               clearTimeout (timer_id)
               timer_id = false
            }
         }
      })

      return new Response (body.pipeThrough (new TextEncoderStream ()), {
         headers: new Headers ({
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
         })
      })
   }

   const fsRoot = pathname.startsWith ("/ctrl") ? "" : "synth"

   return serveDir (req, { fsRoot })
 })