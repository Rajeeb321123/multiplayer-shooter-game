class Player {
  // by putting ({}) instead of () we are making it object rather than array.
  constructor({ x, y, radius, color }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
  }

  draw() {
    c.beginPath()
    c.arc(this.x,
      this.y,
      // setting the size based on screen resolution, so size donot become small in high resolution
      this.radius * window.devicePixelRatio,
      0,
      Math.PI * 2,
      false)
    c.fillStyle = this.color
    c.fill()
  }
}
