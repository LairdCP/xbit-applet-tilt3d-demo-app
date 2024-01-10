export class MovingAverage {
  size
  head = 0
  windowSum = 0
  count = 0
  queue = []

  constructor (size) {
    this.size = size
    for (let i = 0; i < size; i++) {
      this.queue.push(0)
    }
  }

  next (val) {
    ++this.count
    // calculate the new sum by shifting the window
    const tail = (this.head + 1) % this.size
    this.windowSum = this.windowSum - this.queue[tail] + val
    // move on to the next head
    this.head = (this.head + 1) % this.size
    this.queue[this.head] = val
    return this.windowSum * 1.0 / Math.min(this.size, this.count)
  }
}

export function updateAxes (axes, axesSeek, gDelta) {
  // Move axes closer to axesSeek
  let xDelta = gDelta
  let yDelta = gDelta
  let zDelta = gDelta
  const mx = 3

  if (Math.abs(axes.x - axesSeek.x) > 5 * xDelta) {
    xDelta *= mx
  } else if (Math.abs(axes.x - axesSeek.x) < xDelta) {
    xDelta /= mx
  }

  if (axes.x > (axesSeek.x + xDelta)) {
    axes.x -= xDelta
  } else if (axes.x < (axesSeek.x - xDelta)) {
    axes.x += xDelta
  } else {
    axes.x = axesSeek.x
  }

  if (Math.abs(axes.y - axesSeek.y) > 5 * yDelta) {
    yDelta *= mx
  } else if (Math.abs(axes.y - axesSeek.y) > yDelta) {
    yDelta /= mx
  }

  if (axes.y > (axesSeek.y + yDelta)) {
    axes.y -= yDelta
  } else if (axes.y < (axesSeek.y - yDelta)) {
    axes.y += yDelta
  } else {
    axes.y = axesSeek.y
  }

  if (Math.abs(axes.z - axesSeek.z) > 5 * zDelta) {
    zDelta *= mx
  } else if (Math.abs(axes.z - axesSeek.z) > zDelta) {
    zDelta /= mx
  }

  if (axes.z > (axesSeek.z + zDelta)) {
    axes.z -= zDelta
  } else if (axes.z < (axesSeek.z - zDelta)) {
    axes.z += zDelta
  } else {
    axes.z = axesSeek.z
  }

  axes.theta = Math.atan(axes.x / Math.sqrt((axes.y * axes.y) + (axes.z * axes.z)))
  axes.psi = Math.atan(axes.y / Math.sqrt((axes.x * axes.x) + (axes.z * axes.z)))
  axes.phi = Math.atan(Math.sqrt((axes.x * axes.x) + (axes.y * axes.y)) / axes.z)

  axes.tilt = -(axes.theta / (Math.PI / 2) * 90)
  axes.tiltRadians = Math.PI / 180 * axes.tilt
}
