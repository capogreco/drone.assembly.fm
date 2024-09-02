export class IsPlayingIndicator {
   constructor (size, is_playing) {
      this.size = size
   
      this.cnv = document.createElement (`canvas`)
      document.body.appendChild (this.cnv)

      this.cnv.width  = size
      this.cnv.height = size

      Object.assign (this.cnv.style, {
         position: `absolute`,
         left: `${ innerWidth - (this.size + 20) }px`,
         top: `20px`,
         zIndex: 1
      })

      this.ctx = this.cnv.getContext (`2d`)

      this.update (is_playing)
   }

   reposition () {
      this.cnv.style.left = `${ innerWidth - (this.size + 20) }px`
   }

   update (is_playing) {
      this.ctx.clearRect (0, 0, this.cnv.width, this.cnv.height)
      this.ctx.fillStyle = `white`
      if (is_playing) {
         this.ctx.beginPath ()
         this.ctx.moveTo (0, 0)
         this.ctx.lineTo (0, this.size)
         this.ctx.lineTo (this.size, this.size * 0.5)
         this.ctx.closePath ()
         this.ctx.fill ()
      }
      else this.ctx.fillRect (0,0, this.size, this.size)

   }
}