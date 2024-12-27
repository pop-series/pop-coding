let game
function setup() {
    createCanvas(420, 840)
    game = new Game(10, 5, 60)
}

function draw() {
    background('lightgrey')
    game.show()
}

function keyPressed() {
    switch (keyCode) {
        case LEFT_ARROW:
            game.bucket.move(-1)
            break
        case RIGHT_ARROW:
            game.bucket.move(1)
            break
    }
}

const EMPTY_CELL = ''
const GAME_STATES = {
    NOT_STARTED: 'Not Started',
    PLAYING: 'Playing',
    FINISHED: 'Finished',
    PAUSED: 'Paused'
}

class Game {
    constructor(ymax, xmax, rockSize) {
        this.ymax = ymax
        this.xmax = xmax
        this.state = new StateMachine(
            GAME_STATES.NOT_STARTED,
            {
                [GAME_STATES.NOT_STARTED]: { default: GAME_STATES.PLAYING },
                [GAME_STATES.PLAYING]: {
                    default: GAME_STATES.FINISHED,
                    pause: GAME_STATES.PAUSED
                },
                [GAME_STATES.FINISHED]: { default: GAME_STATES.NOT_STARTED },
                [GAME_STATES.PAUSED]: { default: GAME_STATES.PLAYING }
            }
        )
        this.scoreBoard = new ScoreBoard(0)
        this.grid = new Grid(this.ymax, this.xmax)
        this.rockSize = rockSize
        this.rocks = []
        // this.distanceProviderFactory = () => new ConstantSpeedStrategy(1)
        this.distanceProviderFactory = () => new ConstantAccelerationStrategy(1, 0.005)
        this.rockFactoryRateLimiter = new FixedWindowRateLimiter(1, 800)
        this.bucket = new Bucket(this.xmax, floor(random(this.xmax)))
    }

    updateState = () => {
        if (this.rockFactoryRateLimiter.tryAcquire()) {
            this.rocks.push(new Rock(this.distanceProviderFactory(), floor(random(this.xmax))))
        }
    }

    show = () => {
        this.updateState()
        this.showDecorator(() => {
            fill(0)
            textSize(48)
            textAlign(CENTER)
            text("Rock Dodger", 420/2, 60)
        })
        this.showDecorator(() => {
            fill(0)
            textSize(18)
            text("Status: " + this.state.get(), 60, 105)
        })
        this.showDecorator(() => this.scoreBoard.show())

        translate(60, 135)

        this.showDecorator(() => this.grid.show(this.rockSize))
        this.showDecorator(this.showRocks)
        this.showDecorator(() => this.bucket.show(this.ymax, this.rockSize))
    }

    showDecorator = (showFn) => {
        push()
        showFn()
        pop()
    }

    processRock = (rock, x) => {
        if (x === this.bucket.getXPosition()) {
            this.scoreBoard.update()
        }
    }

    showRocks = () => {
        fill(0)
        this.rocks = this.rocks.map(rock => {
            const [y, x] = rock.getPosition()
            if (y > this.ymax) {
                this.processRock(rock, x)
                return undefined
            }
            const [py, px] = [this.rockSize * y, this.rockSize * x + this.rockSize/2]
            circle(px, py, this.rockSize)
            return rock
        }).filter(rock => !!rock)
    }
}

class ScoreBoard {
    constructor(initialScore) {
        this.score = initialScore
    }

    update = () => {
        this.score++
    }

    show = () => {
        fill(0)
        textSize(18)
        textAlign(RIGHT)
        text("Score: " + this.score, 360, 105)
    }
}

class Bucket {
    constructor(xmax, initialX) {
        this.xmax = xmax
        this.x = initialX
        this.taperWidth = 5
    }

    move = (offset) => {
        this.x = constrain(this.x + offset, 0, this.xmax-1)
    }

    getXPosition = () => {
        return this.x
    }

    show = (y, cellSize) => {
        fill('blue');
        beginShape();
        let py = y * cellSize
        let px = this.x * cellSize
        let [bucketWidth, bucketHeight] = [cellSize, cellSize]
        vertex(px, py);
        vertex(px + this.taperWidth, py + bucketHeight);
        vertex(px + bucketWidth - this.taperWidth, py + bucketHeight);
        vertex(px + bucketWidth, py);
        endShape(CLOSE);
    }
}

class FixedWindowRateLimiter {
    constructor(limitForPeriod, periodMillis) {
        this.limitForPeriod = limitForPeriod
        this.periodMillis = periodMillis
        this.lastMillis = Date.now()
        this.counter = 0
    }

    tryAcquire = () => {
        const now = Date.now()
        if (now - this.lastMillis > this.periodMillis) {
            this.lastMillis = now
            this.counter = 0
        }
        if (this.counter >= this.limitForPeriod) {
            return false
        }
        this.counter++
        return true
    }
}

class ConstantSpeedStrategy {
    constructor(speed) {
        this.speed = speed
        this.startMillis = Date.now()
    }

    getDistance = () => {
        return (Date.now() - this.startMillis)*this.speed/1000
    }
}

class ConstantAccelerationStrategy {
    constructor(initialSpeed, acceleration) {
        this.initialSpeed = initialSpeed
        this.acceleration = acceleration
        this.startMillis = Date.now()
    }

    getDistance = () => {
        const elapsed = Date.now() - this.startMillis
        return (this.initialSpeed + (this.acceleration * elapsed / 2))*elapsed/1000
    }
}

class Rock {
    constructor(distanceProvider, x) {
        this.distanceProvider = distanceProvider
        this.x = x
        this.y = 0
    }

    getPosition = () => {
        const distance = this.distanceProvider.getDistance()
        return [this.y + distance, this.x]
    }
}

class Grid {
    constructor(ymax, xmax) {
        this.ymax = ymax
        this.xmax = xmax
    }

    show = (cellSize) => {
        rect(0, 0, this.xmax * cellSize, this.ymax * cellSize)
    }
}

class StateMachine {
    constructor(state, transitions) {
        this.state = state
        this.transitions = transitions
    }

    transition = (action) => {
        const nextState = this.transitions[this.state][action]
        if (nextState) {
            this.state = nextState
            return true
        }
        return false
    }

    get = () => {
        return this.state
    }
}

// Strategy
// Memento
// Observer
// State
// Command
// Factory
// Abstract Factory
// Singleton
