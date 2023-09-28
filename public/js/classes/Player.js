class Player {
  // by putting ({}) instead of () we are making it object rather than array.
  constructor({ x, y, radius, color, username }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
  }

  draw() {
    c.font = '12px sans-serif'
    c.fillStyle = 'white'
    c.fillText(this.username, this.x - 10, this.y + 20)
    c.save()
    c.shadowColor = this.color
    c.shadowBlur = 25
    c.beginPath()
    c.arc(this.x,
      this.y,
      // setting the size based on screen resolution, so size donot become small in high resolution
      // this.radius * window.devicePixelRatio,
      // WE  dont need to consider devicePixelRatio now as we already used c.scale in frontend.js
      this.radius = this.radius,
      0,
      Math.PI * 2,
      false)
    c.fillStyle = this.color
    c.fill()
    c.restore()
  }
}
