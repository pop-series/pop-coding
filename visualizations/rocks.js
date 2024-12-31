let game
function setup() {
    createCanvas(420, 850)
    game = new Game(10, 5, 60)
}

function draw() {
    background('lightgrey')
    game.show()
}

function keyPressed() {
    game.handleKeys(keyCode)
}

const SPACE_KEY_CODE = 32
const EMPTY_CELL = ''
const GAME_STATES = {
    NOT_STARTED: 'Not Started',
    PLAYING: 'Playing',
    FINISHED: 'Finished',
    PAUSED: 'Paused'
}

class Clock {
    constructor() {
        this.startMillis = Date.now()
        this.pausedAtMillis = this.startMillis
        this.offsetMillis = 0
        this.state = 'PAUSED'
    }

    pause = () => {
        if (this.state === 'PAUSED') {
            return
        }
        this.pausedAtMillis = Date.now()
        this.state = 'PAUSED'
    }

    play = () => {
        if (this.state === 'RUNNING') {
            return
        }
        this.offsetMillis += Date.now() - this.pausedAtMillis
        this.pausedAtMillis = 0
        this.state = 'RUNNING'
    }

    now = () => {
        if (this.state === 'PAUSED') {
            return this.pausedAtMillis - this.startMillis - this.offsetMillis
        }
        return Date.now() - this.startMillis - this.offsetMillis
    }
}

class Game {
    constructor(ymax, xmax, rockSize) {
        this.ymax = ymax
        this.xmax = xmax
        this.clock = new Clock()
        this.state = new StateMachine(
            GAME_STATES.NOT_STARTED,
            {
                [GAME_STATES.NOT_STARTED]: {
                    default: GAME_STATES.PLAYING
                },
                [GAME_STATES.PLAYING]: {
                    default: GAME_STATES.PAUSED,
                    finish: GAME_STATES.FINISHED,
                },
                [GAME_STATES.FINISHED]: {
                    default: GAME_STATES.NOT_STARTED
                },
                [GAME_STATES.PAUSED]: {
                    default: GAME_STATES.PLAYING,
                    finish: GAME_STATES.FINISHED
                }
            }
        )
        this.state.subscribe((state, nextState) => {
            switch (nextState) {
                case GAME_STATES.PLAYING:
                    this.clock.play()
                    break
                case GAME_STATES.PAUSED:
                    this.clock.pause()
                    break
                case GAME_STATES.FINISHED:
                    this.clock.pause()
                    break
                case GAME_STATES.NOT_STARTED:
                    this.rocks = []
                    this.scoreBoard.reset()
                    this.clock.pause()
                    break
            }
        })
        this.scoreBoard = new ScoreBoard(0, 3)
        this.scoreBoard.onNegativeLife(() => this.state.transition('finish'))
        this.grid = new Grid(this.ymax, this.xmax)
        this.rockSize = rockSize
        this.rocks = []
        // this.distanceProviderFactory = () => new ConstantSpeedStrategy(1)
        this.distanceProviderFactory = () => new ConstantAccelerationStrategy(this.clock, 1, 0.005)
        this.rockFactoryRateLimiter = new FixedWindowRateLimiter(1, 800)
        this.bucket = new Bucket(this.xmax, floor(random(this.xmax)))
    }

    handleKeys = (keyCode) => {
        switch (keyCode) {
            case LEFT_ARROW:
                if (this.state.get() === GAME_STATES.PLAYING) {
                    game.bucket.move(-1)
                }
                break
            case RIGHT_ARROW:
                if (this.state.get() === GAME_STATES.PLAYING) {
                    game.bucket.move(1)
                }
                break
            case SPACE_KEY_CODE:
                game.toggleState()
                break
        }
    }

    toggleState = () => {
        this.state.transition('default')
    }

    rockFactory = () => {
        const val = floor(random(10))
        if (val < 2) {
            return new Bomb(this.distanceProviderFactory(), floor(random(this.xmax)))
        }
        return new Rock(this.distanceProviderFactory(), floor(random(this.xmax)))
    }

    updateState = () => {
        if (this.state.get() !== GAME_STATES.PLAYING) {
            return
        }
        if (this.rockFactoryRateLimiter.tryAcquire()) {
            this.rocks.push(this.rockFactory())
        }
    }

    show = () => {
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

        this.updateState()
        translate(60, 165)

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
            if (rock.isBomb()) {
                this.state.transition('finish')
            } else {
                this.scoreBoard.updateScore(rock.getWeight())
            }
            return
        }

        if (rock.isBomb()) {
            return
        }
        this.scoreBoard.updateLives(-1)
    }

    getRockColor(rock) {
        let saturation = 0
        saturation = (rock.getWeight()/rock.getMaxWeight()) * 100
        return [120, saturation, 100]
    }


    showRocks = () => {
        colorMode(HSB)
        this.rocks = this.rocks.map(rock => {
            const [y, x] = rock.getPosition()
            if (y > this.ymax) {
                this.processRock(rock, x)
                return undefined
            }
            const [py, px] = [this.rockSize * y, this.rockSize * x + this.rockSize/2]
            if (rock.isBomb()) {
                fill(0, 100, 100)
                triangle(px, py, px - this.rockSize/2, py + this.rockSize, px + this.rockSize/2, py + this.rockSize)
            } else {
                fill(this.getRockColor(rock))
                circle(px, py, this.rockSize)
            }
            return rock
        }).filter(rock => !!rock)
    }
}

class ScoreBoard {
    constructor(initialScore, initialLives) {
        this.initialScore = initialScore
        this.initialLives = initialLives
        this.hiScore = initialScore
        this.score = initialScore
        this.lives = initialLives
        this.negativeLifeSubscribers = []
    }

    onNegativeLife = (subscriber) => {
        this.negativeLifeSubscribers.push(subscriber)
    }

    notify = () => {
        if (this.lives > 0) {
            return
        }
        this.negativeLifeSubscribers.forEach(subscriber => subscriber())
    }

    updateScore = (points) => {
        this.score += points
    }

    updateLives = (delta) => {
        this.lives += delta
        this.notify()
    }

    reset = () => {
        this.hiScore = max(this.hiScore, this.score)
        this.score = this.initialScore
        this.lives = this.initialLives
    }

    show = () => {
        fill(0)
        textSize(18)
        textAlign(RIGHT)
        text("Hi Score: " + this.hiScore, 360, 105)
        text("Score: " + this.score, 360, 125)
        text("Lives: " + this.lives, 360, 145)
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
    constructor(clock, speed) {
        this.clock = clock
        this.speed = speed
        this.startMillis = this.clock.now()
    }

    getDistance = () => {
        return (this.clock.now() - this.startMillis)*this.speed/1000
    }
}

class ConstantAccelerationStrategy {
    constructor(clock, initialSpeed, acceleration) {
        this.clock = clock
        this.initialSpeed = initialSpeed
        this.acceleration = acceleration
        this.startMillis = this.clock.now()
    }

    getDistance = () => {
        const elapsed = this.clock.now() - this.startMillis
        return (this.initialSpeed + (this.acceleration * elapsed / 2))*elapsed/1000
    }
}

class Rock {
    constructor(distanceProvider, x, weight) {
        this.distanceProvider = distanceProvider
        this.x = x
        this.weight = floor(random(1, 5))
        this.y = 0
    }

    getPosition = () => {
        const distance = this.distanceProvider.getDistance()
        return [this.y + distance, this.x]
    }

    getWeight = () => {
        return this.weight
    }

    isBomb = () => {
        return false
    }

    getMaxWeight = () => {
        return 5
    }
}

class Bomb {
    constructor(distanceProvider, x) {
        this.distanceProvider = distanceProvider
        this.x = x
        this.y = 0
    }

    getPosition = () => {
        const distance = this.distanceProvider.getDistance()
        return [this.y + distance, this.x]
    }

    getWeight = () => {
        return 0
    }

    isBomb = () => {
        return true
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
        this.subscribers = []
    }

    subscribe = (subscriber) => {
        this.subscribers.push(subscriber)
    }

    transition = (action) => {
        const nextState = this.transitions[this.state][action]
        if (nextState) {
            this.subscribers.forEach(subscriber => subscriber(this.state, nextState))
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
