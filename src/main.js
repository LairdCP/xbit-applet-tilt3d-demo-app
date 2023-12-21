/* BT510 3D tilt sensor application script */

import p5 from 'p5/lib/p5';
import { xbit, ToggleButton, Button, parseLtvs, hasLtv, bytesToHex, hexToBytes } from '@bennybtl/xbit-lib'
import AppState from './app-state.store.js'
import { MovingAverage, updateAxes } from './util.js'

let canvas

p5.disableFriendlyErrors = true // disable FES for improved performance

let bt510TiltDiagram
AppState.scanButton = new ToggleButton('start-scan', 'Stop Scan', 'Start Scan', ['fa-spinner', 'fa-spin-pulse'], 'fa-wifi', false)
AppState.prevSensorButton = new Button('previous-sensor', 'Previous Sensor')
AppState.nextSensorButton = new Button('next-sensor', 'Next Sensor')
const dropDown = document.getElementById('sensor-list')
const alertText = document.getElementById('alert-text')

dropDown.addEventListener('change', (e) => {
  if (e.target.value === 'none') {
    selectedSensor = null
  } else {
    selectedSensor = sensorsFound.find(sensor => sensor.deviceAddress === e.target.value)
  }
})

const axes = {
  x: 0,
  y: 0,
  z: 0,
  theta: 0,
  psi: 0,
  phi: 0,
  tilt: 0,
  tiltRadians: Math.Pi / 2
}
const axesSeek = {
  x: 0,
  y: 0,
  z: 0,
  theta: 0,
  psi: 0,
  phi: 0,
  tilt: 0,
  tiltRadians: Math.Pi / 2
}
let displayFont
let bt510model
const gDelta = 12
let selectedSensor = null
// let uiButtons = []
let sensorsFound = []
let colors

let handleAd

const updateDropDownList = () => {
  dropDown.innerHTML = ''

  // add 'none' option
  const optionNone = document.createElement('option')
  optionNone.text = 'None'
  optionNone.value = 'none'
  dropDown.add(optionNone)

  sensorsFound.forEach((sensor, i) => {
    const deviceAddressText = bytesToHex(hexToBytes(sensor.deviceAddress).reverse()).toUpperCase()
    const option = document.createElement('option')
    option.text = deviceAddressText
    option.value = sensor.deviceAddress
    dropDown.add(option)
  })

  // if selected, set dropdown to selected sensor
  if (selectedSensor) {
    dropDown.value = selectedSensor.deviceAddress
  } else {
    dropDown.value = 'none'
  }
  // if selected is no longer in the dropdown, deselect
}

const s = (sketch) => {
  let gl

  sketch.preload = () => {
    sketch.loadImage(`${xbit.baseUrl}/bt510TiltDiagram.png`, imgResult => {
      bt510TiltDiagram = imgResult
    })
    displayFont = sketch.loadFont(`${xbit.baseUrl}/Comfortaa-Regular.ttf`)
    bt510model = sketch.loadModel(`${xbit.baseUrl}/bt510.obj`, true)
    // bt510FoundImage = sketch.loadImage(`${xbit.baseUrl}/resources/bt510_found.png`)
    // bt510SelectedImage = sketch.loadImage(`${xbit.baseUrl}/resources/bt510_selected.png`)
    axesSeek.xm = new MovingAverage(5)
    axesSeek.ym = new MovingAverage(5)
    axesSeek.zm = new MovingAverage(5)

    colors = {
      lairdBlue: sketch.color(0, 160, 223),
      lairdPink: sketch.color(184, 69, 227),
      lairdCharcoal: sketch.color(46, 54, 63)
    }
    setInterval(() => {
      updateAxes(axes, axesSeek, gDelta)
    }, 100)
    setInterval(removeUnseenSensors, 1000)
  }

  function removeUnseenSensors () {
    sensorsFound = sensorsFound.filter(sensor => (Date.now() - sensor.lastSeen) < 30000)
    if (sensorsFound.indexOf(selectedSensor) === -1) {
      selectedSensor = null
    }
  }

  sketch.setup = function () {
    // Create a drawing canvas
    const p5Canvas = document.getElementById('p5-canvas')

    canvas = sketch.createCanvas(sketch.windowWidth, sketch.windowHeight, sketch.WEBGL, p5Canvas)
    canvas.canvas.style.display = 'block'
    canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault())

    // Limit GPU usage to 25fps
    sketch.frameRate(25)
    sketch.textFont(displayFont)

    gl = this._renderer.GL
  }

  sketch.windowResized = () => {
    canvas = sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight)
  }

  sketch.draw = () => {
    // Render the app
    sketch.noStroke()
    sketch.background(240)
    sketch.translate((-1 * sketch.width) / 2, (-1 * sketch.height) / 2)

    sketch.push()
    sketch.textStyle(sketch.NORMAL)
    sketch.stroke(200)
    sketch.strokeWeight(8)
    gl.disable(gl.DEPTH_TEST)
    sketch.line(0, sketch.height / 2, sketch.width, sketch.height / 2)
    sketch.line(sketch.width / 2, 0, sketch.width / 2, sketch.height - 70)
    sketch.pop()

    sketch.push()
    sketch.translate(sketch.width / 2, sketch.height / 2)
    if (axes.tilt < 1) {
      if (axes.z > 0) {
        sketch.rotate(axes.tiltRadians)
      } else {
        sketch.rotate(Math.PI - axes.tiltRadians)
      }
    } else {
      if (axes.phi > 0) {
        sketch.rotate(axes.tiltRadians)
      } else {
        sketch.rotate(Math.PI - axes.tiltRadians)
      }
    }
    sketch.strokeWeight(8)
    sketch.stroke(colors.lairdBlue)
    sketch.line(-1 * sketch.width, 0, -1 * sketch.width, 0)
    sketch.pop()

    sketch.fill(200)
    sketch.rect(0, sketch.height - 70, sketch.width, 70)
    if (!AppState.scanButton.state) {
      AppState.alertText = 'Press \'Start Scan\' to capture tilt data'
    } else {
      if (selectedSensor) {
        AppState.alertText = ''
      } else {
        AppState.alertText = 'No BT510 tilt sensor selected'
      }
    }
    if (bt510TiltDiagram && sketch.width > 720) {
      const tdwidth = (sketch.width / 6)
      const tdheight = tdwidth * (bt510TiltDiagram.width / bt510TiltDiagram.height)
      sketch.image(
        bt510TiltDiagram,
        sketch.width - tdwidth - 10,
        10,
        tdwidth,
        tdheight
      )
    }

    gl.enable(gl.DEPTH_TEST)

    // Update the axis display
    if (AppState.scanButton.state) {
      let txtXoff = 140
      sketch.fill(180, 200, 210)
      if (sketch.width > 720) {
        sketch.textSize(24)
        sketch.text('X:' + axes.x.toFixed(2), 10, sketch.height - 140)
        sketch.text('Y:' + axes.y.toFixed(2), 10, sketch.height - 115)
        sketch.text('Z:' + axes.z.toFixed(2), 10, sketch.height - 90)
        if (!isNaN(axes.theta)) {
          sketch.text('theta:' + axes.theta.toFixed(2), txtXoff, sketch.height - 140)
        }
        if (!isNaN(axes.psi)) {
          sketch.text('psi:' + axes.psi.toFixed(2), txtXoff + 20, sketch.height - 115)
        }
        if (!isNaN(axes.phi)) {
          sketch.text('phi:' + axes.phi.toFixed(2), txtXoff + 20, sketch.height - 90)
        }
        sketch.noStroke()
        sketch.textSize(100)
        sketch.fill(140, 160, 170)

        if (!isNaN(axes.tilt)) {
          sketch.text(axes.tilt.toFixed(0) + '°', sketch.width - 140 - sketch.textWidth(axes.tilt.toFixed(0)) / 2, sketch.height - 100)
        }
      } else {
        txtXoff = 80
        sketch.textSize(16)
        sketch.text('X:' + axes.x.toFixed(2), 10, sketch.height - 150)
        sketch.text('Y:' + axes.y.toFixed(2), 10, sketch.height - 120)
        sketch.text('Z:' + axes.z.toFixed(2), 10, sketch.height - 90)

        if (!isNaN(axes.theta)) {
          sketch.text('theta:' + axes.theta.toFixed(2), txtXoff, sketch.height - 150)
        }
        if (!isNaN(axes.psi)) {
          sketch.text('psi:' + axes.psi.toFixed(2), txtXoff + 20, sketch.height - 120)
        }
        if (!isNaN(axes.phi)) {
          sketch.text('phi:' + axes.phi.toFixed(2), txtXoff + 20, sketch.height - 90)
        }

        sketch.noStroke()
        sketch.textSize(60)
        sketch.fill(140, 160, 170)
        if (!isNaN(axes.tilt)) {
          sketch.text(axes.tilt.toFixed(0) + '°', sketch.width - 80 - sketch.textWidth(axes.tilt.toFixed(0)) / 2, sketch.height - 120)
        }
      }
    }

    sketch.push()
    const locX = 0
    const locY = -1200
    sketch.ambientLight(90, 90, 90)
    sketch.pointLight(255, 255, 255, locX, locY, 1200)

    sketch.translate(sketch.width / 2, sketch.height / 2)
    sketch.scale(sketch.height / 400) // Scaled to make model fit into canvas

    if (axes.tilt < 1) {
      if (axes.z > 0) {
        sketch.rotateZ(Math.PI - axes.theta)
      } else {
        sketch.rotateZ(axes.theta)
      }
    } else {
      if (axes.phi > 0) {
        sketch.rotateZ(Math.PI - axes.theta)
      } else {
        sketch.rotateZ(axes.theta)
      }
    }

    sketch.rotateX(axes.psi)
    sketch.ambientMaterial(250, 230, 220)
    sketch.model(bt510model)
    sketch.pop()

    sketch.fill(colors.lairdBlue)
    if (sketch.width > 720) {
      sketch.textSize(30)
      sketch.textStyle(sketch.BOLD)
      sketch.text('Laird Connectivity Sentrius™ BT510', 10, 32)
      sketch.fill(200)
      sketch.text('Tilt Sensor Applet', 10, 65)
      sketch.textSize(16)
    } else {
      sketch.textSize(18)
      sketch.textStyle(sketch.BOLD)
      sketch.text('Laird Connectivity Sentrius™ BT510', 10, 22)
      sketch.fill(200)
      sketch.text('Tilt Sensor Applet', 10, 45)
      sketch.textSize(12)
    }
    sketch.fill(140, 160, 170)

    if (alertText.innerText !== AppState.alertText) {
      if (AppState.alertText !== '') {
        alertText.innerText = AppState.alertText
        alertText.style.display = 'block'
        const i = document.createElement('i')
        i.classList.add('mr-2', 'fa-solid', 'fa-triangle-exclamation')
        alertText.prepend(i)
      } else {
        alertText.innerText = ''
        alertText.style.display = 'none'
      }
    }
  }

  AppState.nextSensorButton.button.addEventListener('click', () => {
    const selectedSensorIndex = sensorsFound.indexOf(selectedSensor)
    if (selectedSensorIndex > 0) {
      selectedSensor = sensorsFound[selectedSensorIndex - 1]
    } else {
      selectedSensor = sensorsFound[sensorsFound.length]
    }
    if (selectedSensor) {
      dropDown.value = selectedSensor.deviceAddress
    } else {
      dropDown.value = 'none'
    }
  })

  AppState.prevSensorButton.button.addEventListener('click', () => {
    const selectedSensorIndex = sensorsFound.indexOf(selectedSensor)
    if (selectedSensorIndex < (sensorsFound.length - 1)) {
      selectedSensor = sensorsFound[selectedSensorIndex + 1]
    } else {
      selectedSensor = sensorsFound[0]
    }
    if (selectedSensor) {
      dropDown.value = selectedSensor.deviceAddress
    } else {
      dropDown.value = 'none'
    }
  })

  AppState.scanButton.button.addEventListener('click', () => {
    if (!AppState.scanButton.state) {
      xbit.sendStartBluetoothScanningCommand()
      .then((response) => {
      // this will fire if the command is successful
        AppState.scanButton.toggle()
        AppState.prevSensorButton.enable()
        AppState.nextSensorButton.enable()
      }).catch((error) => {
        console.error(error)
      })
    } else {
      xbit.sendStopBluetoothScanningCommand()
      .then((response) => {
        AppState.scanButton.toggle()
        AppState.prevSensorButton.disable()
        AppState.nextSensorButton.disable()
      }).catch((error) => {
        console.error(error)
      })
    }
  })

  function toSigned8 (val) {
    val &= 0xFF
    if (val & 0x80) {
      return val - 256
    }
    return val
  }

  const isSensorFound = (deviceAddress) => {
    for (const s of sensorsFound) {
      if (s.deviceAddress === deviceAddress) {
        return true
      }
    }
    return false
  }

  const updateSensorLastSeen = (deviceAddress) => {
    for (const s of sensorsFound) {
      if (s.deviceAddress === deviceAddress) {
        s.lastSeen = Date.now()
        return
      }
    }
  }

  handleAd = ({ deviceAddress, ad }) => {
    if (ad) {
      const hexAd = bytesToHex(ad)
      const ltvMap = parseLtvs(hexAd)
      let parsedAd = null
  
      try {
        if (ltvMap.ff) {
          parseManufacturerData(ltvMap.ff).forEach((data) => {
            parsedAd = Object.assign(parsedAd || {}, data)
          })
        }
      } catch (e) {
        // console.log(e)
      }
      // Check for Laird mfg id and BT510 tilt sensor protocol ID (0xc9)
      const ffLtv = hasLtv('ff', [0x77, 0x00, 0xc9, 0x00], ltvMap)
      if (ffLtv) {
          if (!isSensorFound(deviceAddress)) {
          // Add the sensor to the drop down list
          sensorsFound.push({ deviceAddress, lastSeen: Date.now() })
          updateDropDownList()
        } else {
          updateSensorLastSeen(deviceAddress)
        }

        if (selectedSensor === null) {
          selectedSensor = sensorsFound[sensorsFound.length - 1]
          dropDown.value = selectedSensor.deviceAddress
        } else if (deviceAddress === selectedSensor.deviceAddress) {
          axesSeek.x = axesSeek.xm.next(toSigned8(((ffLtv[4]) << 8) | (ffLtv[5])))
          axesSeek.y = axesSeek.ym.next(toSigned8(((ffLtv[6]) << 8) | (ffLtv[7])))
          axesSeek.z = axesSeek.zm.next(toSigned8(((ffLtv[8]) << 8) | (ffLtv[9])))
        }
      }
    }
  }
}

const myp5 = new p5(s) // eslint-disable-line no-unused-vars, new-cap

// recieve events from the backend
const eventListenerHandler = (data) => {
  // if (!AppState.scanButton.state) return
  if (!AppState.scanButton.state && !AppState.scanStopping) {
      AppState.scanButton.setOn()
  }
  if (AppState.scanButton.state) {
    handleAd(data.params)
  }
}

xbit.addEventListener('bluetoothDeviceDiscovered', eventListenerHandler)

window.onunload = () => {
  xbit.removeEventListener(eventListenerHandler)
}

// check to see if a port is selected and enable / disable the scan button
// xbit.getSelectedPort()
// .then((response) => {
//   console.log(response)
//   if (response.connected) {
//     AppState.scanButton.enable()
//   } else {
//     AppState.scanButton.disable()
//     // set alert message to select a dongle
//     AppState.alertText = 'No USB adapter selected. Use the drop down above to select one.'
//   }
// }).catch((error) => {
//   console.error(error)
// })

// register for events when the selected port changes
