let game
let SPACE_KEY_CODE = 32
let QUIT_KEY_COD = 81

/*
TODO:
1. Error in compress()
2. Better use of observer pattern for game state transition

 */


function setup() {
    createCanvas(500, 850)
    game = new Game()
}

function draw() {
    background('lightgrey')
    game.show()
}

function keyPressed() {
    switch(keyCode) {
        case DOWN_ARROW:
        case LEFT_ARROW:
        case RIGHT_ARROW:
            new MoveCommand(game, keyCode).execute()
            break
        case UP_ARROW:
            new ToggleShapeCommand(game).execute()
            break
        case QUIT_KEY_COD:
        case SPACE_KEY_CODE:
            new ControlCommand(game, keyCode).execute()
            break
        default:
            break
    }
}

function gameStateMachineFactory() {
    return new StateMachine(
        'Not Started',
        {
            'Not Started': {
                'default': 'Playing',
                'play': 'Playing'
            },
            'Playing': {
                'default': 'Paused',
                'pause': 'Paused',
                'quit': 'Aborted',
                'finish': 'Finished'
            },
            'Paused': {
                'default': 'Playing',
                'play': 'Playing',
                'quit': 'Aborted'
            },
            'Finished': {
                'default': 'Not Started'
            },
            'Aborted': {}
        }
    )
}

class Game {
    constructor() {
        this.xmax = 10
        this.ymax = 20
        this.cellSize = 36
        this.grid = new Grid(this.cellSize, this.xmax, this.ymax)
        this.tetrominoFactory = new TetrominoFactory()
        this.gameState = gameStateMachineFactory()
        this.scoreBoard = new ScoreBoard(this.gameState)
        this.grid.addObserver('scoreboard', this.scoreBoard)
        this.tickFreq = 300
        this.lastTick = this.getTick()
    }

    getTick() {
        return floor(millis() / this.tickFreq)
    }

    assignTetromino() {
        this.tx = this.ty = 0
        this.tetromino = this.tetrominoFactory.create()
    }

    toggleShape() {
        if (!this.tetromino || !this.isGameActive()) {
            return
        }
        const newTetromino = this.tetromino.toggle()
        if (this.grid.validate(newTetromino, this.tx, this.ty)) {
            this.tetromino = newTetromino
        }
    }

    reset() {
        this.tetromino = this.tx = this.ty = undefined
        this.grid.reset()
    }

    isGameActive() {
        return this.gameState.get() === 'Playing'
    }

    moveVertically() {
        const tick = this.getTick()
        if (tick <= this.lastTick) {
            return
        }
        this.lastTick = tick

        this.grid.compress()
        if (this.grid.isFull()) {
            this.scoreBoard.gameState.transition('finish')
        }
        if (this.tetromino) {
            if (this.grid.validate(this.tetromino, this.tx, this.ty+1)) {
                this.ty += 1
                return
            }
            this.grid.merge(this.tetromino, this.tx, this.ty)
            this.assignTetromino()
        }
    }

    shiftTetromino(xOff) {
        if (!this.tetromino || !this.isGameActive()) {
            return
        }
        if(this.grid.validate(this.tetromino, this.tx + xOff, this.ty)) {
            this.tx += xOff
        }
    }

    show() {
        if (this.isGameActive()) {
            if (!this.tetromino) {
                this.assignTetromino()
            }
            this.moveVertically()
        }

        textSize(60)
        text("Tetris", 50, 75)

        push()
        translate(250, 30)
        this.scoreBoard.show()
        pop()

        push()
        translate(70, 100)
        this.grid.show()

        if(this.tetromino) {
            stroke('black')
            fill('red')
            this.tetromino.show(this.cellSize, this.tx, this.ty)
        }
        pop()
    }
}

class Grid {
    constructor(cellSize, xmax, ymax) {
        this.cellSize = cellSize
        this.xmax = xmax
        this.ymax = ymax
        this.blocks = Array(ymax).fill().map(() => Array(xmax).fill(0))
        this.observers = new Map()
    }

    reset() {
        for (let y=0; y<this.ymax; y++) {
            for (let x=0; x<this.xmax; x++) {
                this.blocks[y][x] = 0
            }
        }
    }

    isFull() {
        return this.blocks[0].some(cell => cell === 1)
    }

    validate(tetromino, x, y) {
        let pixels = tetromino.pixels()
        for (let pixel of pixels) {
            let px = pixel[0] + x
            let py = pixel[1] + y
            if (px < 0 || py < 0 || px >= this.xmax || py >= this.ymax || this.blocks[py][px] === 1) {
                return false
            }
        }
        return true
    }

    addObserver(id, observer) {
        this.observers.set(id, observer)
    }

    removeObserver(id) {

    }

    notifyObservers(points) {
        for (const observer of this.observers.values()) {
            observer.update(points)
        }
    }

    merge(tetromino, x, y) {
        let pixels = tetromino.pixels()
        for (let pixel of pixels) {
            let px = pixel[0] + x
            let py = pixel[1] + y
            this.blocks[py][px] = 1
        }
        this.compress()
    }

    compress() {
        const newBlocks = this.blocks.filter(line => line.some(cell => cell === 0))
        if (newBlocks.length === this.ymax) {
            return
        }
        let numLines = this.ymax - newBlocks.length
        this.blocks = [...Array(numLines).fill().map(() => Array(this.xmax).fill(0)), ...this.blocks]
        this.notifyObservers(this.xmax * numLines)
    }

    show() {
        stroke('blue')
        for (let y=0; y<this.ymax; y++) {
            for (let x=0; x<this.xmax; x++) {
                fill(this.blocks[y][x] ? 0 : 255)
                square(this.cellSize * x, this.cellSize * y, this.cellSize)
            }
        }
    }
}

class ScoreBoard {
    constructor(gameState) {
        this.gameState = gameState
        this.score = 0
        this.hiScore = 0
    }

    update(points) {
        this.score += points
        this.hiScore = max(this.hiScore, this.score)
    }

    show() {
        textSize(20)
        text("Hi Score: " + this.hiScore, 0, 0)
        text("Status:   " + this.gameState.get(), 0, 25)
        text("Score:    " + this.score, 0, 50)
    }
}

class Tetromino {
    constructor(blocks) {
        this.blocks = blocks
    }

    pixels() {
        return this.blocks
    }

    show(cellSize, x, y) {
        for (let block of this.blocks) {
            square(cellSize * (x + block[0]), cellSize * (y + block[1]), cellSize)
        }
    }

    toggle() {
        return new Tetromino(this.blocks.map(el => [el[1], el[0]]))
    }
}

class TetrominoFactory {
    constructor() {
        const LINE = new Tetromino([
            [0,0], [1,0], [2,0], [3,0]
        ])
        const BOX = new Tetromino([
            [0,0], [1,0], [0,1], [1,1]
        ])
        const T = new Tetromino([
            [1,0], [0,1], [1,1], [2,1]
        ])
        const S = new Tetromino([
            [1,0], [2,0], [0,1], [1,1]
        ])
        const Z = new Tetromino([
            [0,0], [1,0], [1,1], [2,1]
        ])
        const J = new Tetromino([
            [1,0], [1,1], [0,2], [1,2]
        ])
        const L = new Tetromino([
            [0,0], [0,1], [0,2], [1,2]
        ])
        this.shapes = [
            LINE,
            BOX,
            T,
            S,
            Z,
            J,
            L
        ]
    }

    getRandomIndex() {
        return Math.floor(random(this.shapes.length))
    }

    create() {
        return this.shapes[this.getRandomIndex()]
    }
}

class StateMachine {
    constructor(initialState, transitions) {
        this.state = initialState
        this.transitions = transitions
    }

    transition(action) {
        const nextState = this.transitions[this.state][action]
        if (nextState) {
            this.state = nextState
            return true
        }
        return false
    }

    get() {
        return this.state
    }
}

class MoveCommand {
    constructor(game, keyCode) {
        this.game = game
        this.keyCode = keyCode
    }

    execute() {
        switch(this.keyCode) {
            case DOWN_ARROW:
                break
            case LEFT_ARROW:
                this.game.shiftTetromino(-1)
                break
            case RIGHT_ARROW:
                this.game.shiftTetromino(1)
                break
        }

    }
}

class ControlCommand {
    constructor(game, keyCode) {
        this.game = game
        this.keyCode = keyCode
    }

    execute() {
        switch(this.keyCode) {
            case SPACE_KEY_CODE:
                if (this.game.gameState.get() === 'Finished') {
                    this.game.reset()
                }
                this.game.gameState.transition('default')
                break
            case QUIT_KEY_COD:
                break
        }
    }
}

class ToggleShapeCommand {
    constructor(game) {
        this.game = game
    }

    execute() {
        this.game.toggleShape()
    }
}
