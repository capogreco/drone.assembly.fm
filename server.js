import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts"

console.clear ()

const handler = async req => {
   const { pathname } = new URL (req.url)

   const path_array = pathname.slice (1).split (`/`)

   if (path_array[0] === `api`) {
      console.log (`api called`)
      const bc = new BroadcastChannel (`program`)
      const db = await Deno.openKv ()
      const api_handler = {
         listen: () => {
            const body = new ReadableStream ({
               start: controller => {
                  controller.enqueue (`data: ES established \n\n`)
                  bc.onmessage = async e => {
                     if (e.data === `update`) {
                        const { value: { message } } = await db.get ([ `test` ])
                        controller.enqueue (`data: ${ message } \n\n`)   
                     }
                  }
               },
               cancel: () => bc.close ()
            })
            const stream = body.pipeThrough (new TextEncoderStream ())
            const headers = new Headers ({
               "content-type": "text/event-stream",
               "cache-control": "no-cache",
            })
            return new Response (stream, { headers })
         },
         update: async () => {
            const json = await req.json ()
            await db.set ([ `test` ], json)
            bc.postMessage (`update`)
            return new Response ()
         },
      }
      return api_handler[path_array[1]] ()
   }

   const fsRoot = path_array[0] === `ctrl` ? "" : "synth"

   return serveDir (req, { fsRoot })
}

Deno.serve ({ handler })