import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts"
import { handle_api } from "./etc/api.js"

console.clear ()

const handler = async req => {
   const { pathname } = new URL (req.url)

   const path_array = pathname.slice (1).split (`/`)

   if (path_array[0] === `api`) {
      return handle_api (req, path_array[1])
   }

   const fsRoot = path_array[0] === `ctrl` ? "" : "synth"

   return serveDir (req, { fsRoot, quiet: true })
}

Deno.serve ({ handler })