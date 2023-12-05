class Grid {
    constructor(scale, canvas) {
        this._scale = scale
        this._canvas = canvas
        this._renderingContext = canvas.getContext('2d')
        this._drawGrid()
        this._canvas.addEventListener('click', this._clickListener(), false);
    }

    _scale
    _numbersSize = 20
    _xOffset
    _height
    _createdPoints = new Set()
    _manuallyClicked = []
    _rendering = undefined

    _drawGrid() {
        this._renderingContext.clearRect(0, 0, this._canvas.width, this._canvas.height)
        this._renderingContext.font = this._numbersSize.toString() + 'px serif'
        const m = Math.floor(this._canvas.height / this._scale)
        const xOffset = this._renderingContext.measureText(m.toString())
        this._xOffset = xOffset.width
        this._drawSquares(this._canvas.width - xOffset.width, this._canvas.height - this._numbersSize)
        this._drawDigits([xOffset.width, this._canvas.height - this._numbersSize])
        this._height = this._canvas.height - this._numbersSize
    }

    _drawSquares(width, height) {
        let ctx = this._canvas.getContext('2d')
        let xOffset = this._canvas.width - width
        const m = height / this._scale
        const n = width / this._scale
        for (let i = 0; i < m; ++i) {
            for (let j = 0; j < n; ++j) {
                ctx.strokeRect(xOffset + j * this._scale, height - (i + 1) * this._scale, this._scale, this._scale)
            }
        }
    }

    _drawDigits(zero) {
        const [x, y] = zero
        const m = Math.floor(y / this._scale)
        const n = Math.floor((this._canvas.width - x) / this._scale)
        for (let i = 0; i < m; ++i) {
            this._renderingContext.fillText(i.toString(), 0, y - i * this._scale - (this._scale - this._numbersSize) / 2)
        }
        for (let i = 0; i < n; ++i) {
            this._renderingContext.fillText(i.toString(), i * this._scale + (this._scale + x) / 2, this._canvas.height)
        }
    }

    _getRectCoords(x, y) {
        return [this._xOffset + x * this._scale, this._height - (y + 1) * this._scale]
    }

    _getRectCoordsFromClick(x, y) {
        return [
            Math.floor((x - this._xOffset) / this._scale),
            Math.floor((this._height - y) / this._scale)
        ]
    };

    _clickListener() {
        const self = this
        return async e => {
            if (self._rendering !== undefined) {
                await self._rendering
            }
            if (self._manuallyClicked.length === 2) {
                let toRemove = []
                for (let created of self._createdPoints) {
                    let s = created.split(' ')
                    let x = parseInt(s[0])
                    let y = parseInt(s[1])
                    toRemove.push([x, y])
                }
                for (let p of toRemove) {
                    self.clearPixel(...p)
                }
                self._manuallyClicked = []
            }
            const rect = this._canvas.getBoundingClientRect()
            if (e.x - rect.left <= this._xOffset || e.y - rect.top > this._height) {
                return
            }
            let [x, y] = self._getRectCoordsFromClick(e.x - rect.left, e.y - rect.top)
            self._manuallyClicked.push({'x': x, 'y': y})
            if (this._createdPoints.has(x.toString() + ' ' + y.toString())) {
                self.clearPixel(x, y)
            } else {
                self.setPixel(x, y)
            }
            if (self._manuallyClicked.length === 2) {
                if (this._isBresenham) {
                    this._rendering = bresenhamAlgorithm(self._manuallyClicked[0], self._manuallyClicked[1], this._sleepTime)
                } else {
                    this._rendering = drawLineBySteps(self._manuallyClicked[0], self._manuallyClicked[1], this._sleepTime, this._step)
                }
                await this._rendering
                this._rendering = undefined
            }
        }
    }

    width() {
        return this._canvas.width - this._xOffset
    }

    height() {
        return this._height
    }

    setPixel(x, y) {
        if (x < 0 || y < 0) {
            return
        }
        const [xRect, yRect] = this._getRectCoords(x, y)
        this._renderingContext.fillRect(xRect, yRect, this._scale, this._scale)
        this._createdPoints.add(x.toString() + ' ' + y.toString())
    }

    clearPixel(x, y) {
        if (x < 0 || y < 0) {
            return
        }
        const [xRect, yRect] = this._getRectCoords(x, y)
        this._renderingContext.clearRect(xRect, yRect, this._scale, this._scale)
        this._renderingContext.strokeRect(xRect, yRect, this._scale, this._scale)
        this._createdPoints.delete(x.toString() + ' ' + y.toString())
    }

    async setScale(newScale) {
        if (this._rendering !== undefined) {
            await this._rendering
        }
        this._scale = newScale
        this._drawGrid()
        for (let p of this._createdPoints) {
            let spl = p.split(' ')
            this.setPixel(parseInt(spl[0]), parseInt(spl[1]))
        }
    }

    async setSleepTime(value) {
        if (this._rendering !== undefined) {
            await this._rendering
        }
        this._sleepTime = value
    }

    async setStep(value) {
        if (this._rendering !== undefined) {
            await this._rendering
        }
        this._step = value
    }

    useBresenham() {
        this._isBresenham = true
    }

    useByStep() {
        this._isBresenham = false
    }

    _canvas
    _renderingContext

    _sleepTime = 100
    _step = 0.1
    _isBresenham = false
}

grid = new Grid(
    50, document.getElementById('canvas')
)

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function drawLineBySteps(start, end, sleepTime = 100, step = 0.01) {
    if (start.x === end.x) {
        if (start.y > end.y) {
            return drawLineBySteps(end, start, sleepTime, step)
        }
        for (let i = start.y; i <= end.y; ++i) {
            await timeout(sleepTime)
            grid.setPixel(start.x, i)
        }
        return;
    }
    const dx = end.x - start.x
    const dy = end.y - start.y
    const k = dy / dx
    const b = (end.x * start.y - start.x * end.y) / dx
    const draw = async x => {
        grid.setPixel(Math.floor(x), Math.floor(k * x + b))
        await timeout(sleepTime * step)
    }

    if (start.x < end.x) {
        for (let i = start.x; i < end.x; i += step) {
            await draw(i)
        }
    } else {
        for (let i = start.x; i > end.x; i -= step) {
            await draw(i)
        }
    }
}

async function bresenhamAlgorithm(start, end, sleepTime = 100) {
    console.log(start)
    console.log(end)
    let dx = Math.abs(end.x - start.x)
    let sx = start.x < end.x ? 1 : -1
    let dy = Math.abs(end.y - start.y)
    let sy = start.y < end.y ? 1 : -1
    let x0 = start.x
    let y0 = start.y
    let x1 = end.x
    let y1 = end.y
    let err = dx - dy

    while (true) {
      grid.setPixel(x0, y0);
      await timeout(sleepTime)
      if (x0 === x1 && y0 === y1) break;
      let e2 = 2*err;
      if (e2 >= -dy) { err -= dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
   }
}

async function updateScale(e) {
    await grid.setScale(parseInt(e.target.value))
    document.getElementById('range-value').innerText = e.target.value
}

async function updateSleepTime(e) {
    await grid.setSleepTime(parseInt(e.target.value))
    document.getElementById('sleep-value').innerText = e.target.value + 'мс'
}

async function updateStep(e) {
    await grid.setStep(parseFloat(e.target.value) / 100)
    document.getElementById('step-value').innerText = (parseFloat(e.target.value) / 100).toFixed(2)
}

async function updateAlgo(s) {
    if (s.value === 'step') {
        await grid.useByStep()
    } else {
        await grid.useBresenham()
    }
}

document.getElementById('scale-slider').addEventListener('input', updateScale)
document.getElementById('sleep-slider').addEventListener('input', updateSleepTime)
document.getElementById('step-slider').addEventListener('input', updateStep)