const tau = Math.PI * 2

export class Knob {
   constructor (pos, w, c, v) {
      this.cnv = document.createElement (`canvas`)
      document.body.appendChild (this.cnv)
      this.cnv.width = w
      this.cnv.height = w
      this.cnv.style.position = `absolute`
      this.cnv.style.left = `${ pos.x }px`
      this.cnv.style.top  = `${ pos.y }px`

      this.ctx = this.cnv.getContext (`2d`)

      const r = tau * 0.75 * v / 127
      const k = tau * -0.125

      const p1 = {
         x: (w * 0.5) + (w * 0.4 * Math.sin (k - r)),
         y: (w * 0.5) + (w * 0.4 * Math.cos (k - r))
      }

      const p2 = {
         x: (w * 0.5) + (w * 0.2 * Math.sin (k - r)),
         y: (w * 0.5) + (w * 0.2 * Math.cos (k - r))
      }

      this.ctx.fillStyle = `darkmagenta`
      this.ctx.fillRect (0, 0, w, w)

      this.ctx.strokeStyle = `white`
      this.ctx.lineWidth = w * 0.1

      this.ctx.beginPath ()
      this.ctx.arc (w * 0.5, w * 0.5, w * 0.3, r, tau * 0.75 + r, false)
      this.ctx.moveTo (p1.x, p1.y)
      this.ctx.lineTo (p2.x, p2.y)
      this.ctx.stroke ()

      this.ctx.fillStyle = `white`
      this.ctx.font = `bold ${ w * 0.2 }px sans-serif`

      this.ctx.textAlign = `center`
      this.ctx.fillText (v.toString (), w * 0.5, w * 0.57)

      this.ctx.font = `bold ${ w * 0.15 }px sans-serif`
      this.ctx.textAlign = `left`
      this.ctx.fillText (c.toString (), w * 0.03, w * 0.15)
   }
}