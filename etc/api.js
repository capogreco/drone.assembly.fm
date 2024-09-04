export const handle_api = async (req, type) => {

   const bc = new BroadcastChannel (`program`)
   const db = await Deno.openKv ()

   const start = controller => {
      const payload = {
         type: `welcome`,
         message: `event source established`
      }
      controller.enqueue (`data: ${JSON.stringify (payload) } \n\n`)
      bc.onmessage = async e => {
         console.log (e.data)
         const handler = {
            update: async () => {
               const { value } = await db.get ([ `program` ])
               const program = JSON.stringify (value)
               // const payload = JSON.stringify ({
               //    type: `update`,
               //    program,
               // })
               controller.enqueue (`data: ${ program } \n\n`)
            },
            save: async () => {
               const { value } = await db.get ([ `bank`, e.data.key ])
               const payload = JSON.stringify ({
                  type: `save`,
                  key: e.data.key,
                  program: value,
               })
               controller.enqueue (`data: ${ payload } \n\n`)
            },
            load: async () => {
               const { value } = await db.get ([ `bank`, e.data.key ])
               const payload = JSON.stringify ({
                  type: `load`,
                  key: e.data.key,
                  current_program: e.data.values,
                  load_program: value
               })
               controller.enqueue (`data: ${ payload } \n\n`)
            }  
         }
         // if (e.data.type === `update`) {
         //    const { value } = await db.get ([ `program` ])
         //    const message = JSON.stringify (value)
         //    controller.enqueue (`data: ${ message } \n\n`)   
         // }
         handler[e.data.type] ()
      }
   }

   const cancel = () => bc.close ()

   const handler = {
      listen: () => {
         const body = new ReadableStream ({ start, cancel })
         const stream = body.pipeThrough (new TextEncoderStream ())
         const headers = new Headers ({
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
         })
         return new Response (stream, { headers })
      },
      update: async () => {
         const json = await req.json ()
         await db.set ([ `program` ], json)
         const payload = {
            type: `update`
         }
         bc.postMessage (payload)
         return new Response ()
      },
      bank: async () => {
         const json = await req.json ()
         const { type, key, values } = json
         const bank_handler = {
            save: async () => {
               await db.set ([ `bank`, key ], values)
               const payload = {
                  type: `save`,
                  key,
               }
               bc.postMessage (payload)
               return new Response ()
            },
            load: async () => {
               console.log (`load`)
               const payload = {
                  type: `load`,
                  key, values,
               }
               bc.postMessage (payload)
               return new Response ()
            }
         }

         bank_handler[type] ()
         // const bank = await db.get ([ `bank` ])
         // const new_bank = { ...bank, [key]: values }
         // await db.set ([ `bank` ], new_bank)
         return new Response ()
      },
   }
   return handler[type] ()   
}
