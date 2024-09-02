export class UpdateMessage {
   constructor () {
      this.timeout_id = false
      this.div = document.createElement (`div`)

      Object.assign (this.div.style, {
         font: `italic bolder 40px sans-serif`,
         justifyContent: `center`,
         textAlign: `center`,
         userSelect: `none`,
         position: `fixed`,
         width: `100%`,
         color: `white`,
         top: `${ globalThis.innerHeight  - 60}px`,
         zIndex: 1,
      })

      document.body.appendChild (this.div)
   }

   reposition () {
      this.div.style.top = `${ globalThis.innerHeight  - 60}px`
   }

   trigger () {
      if (this.timeout_id) clearTimeout (this.timeout_id)

      this.div.innerHTML = `UPDATING`

      this.timeout_id = setTimeout (() => {
         this.div.innerHTML = ``
      }, 1000)
   }
}