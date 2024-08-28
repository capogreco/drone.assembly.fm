export const handle_api = async (req, type) => {

   const bc = new BroadcastChannel (`program`)
   const db = await Deno.openKv ()

   const start = controller => {
      controller.enqueue (`data: ES established \n\n`)
      bc.onmessage = async e => {
         if (e.data === `update`) {
            const { value: { message } } = await db.get ([ `test` ])
            controller.enqueue (`data: ${ message } \n\n`)   
         }
      }
   }

   const cancel = () => bc.close ()

   const handler = {
      listen: () => {
         const body = new ReadableStream ({
            start, cancel
            // cancel: () => bc.close ()
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
   return handler[type] ()   
}
