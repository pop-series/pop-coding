let game

function setup() {
    createCanvas(500, 600)
    game = new Game(4, 100)
    rectMode(CENTER)
}

function draw() {
    background('lightgrey')
    push()
    game.show()
    pop()
}

function keyPressed(){
    game.executeCommand(keyCode)
}

const SPACE_KEY_CODE = 32
const EMPTY_CELL = ''
const DEFAULT_ACTION = 'default'
const NOT_STARTED = 'Not Started'
const PLAYING = 'Playing'
const FINISHED = 'Finished'

class Game {
    constructor(boardSize, cellSize) {
        this.boardSize = boardSize
        this.cellSize = cellSize
        this.board = Array(boardSize).fill().map(() => Array(boardSize).fill(EMPTY_CELL))
        this.state = new StateMachine(
            NOT_STARTED,
            {
                'Not Started': {
                    'default': PLAYING
                },
                'Playing': {
                    'default': FINISHED
                },
                'Finished': {
                    'default': NOT_STARTED
                }
            }
        )
        this.arrowCommand = new Map()
            .set(LEFT_ARROW, this.moveLeft)
            .set(UP_ARROW, this.moveUp)
            .set(RIGHT_ARROW, this.moveRight)
            .set(DOWN_ARROW, this.moveDown)
    }

    show() {
        textSize(72)
        text("2048", 175, 75)
        textSize(24)
        text("Status: " + this.state.get(), 150, 125)
        translate(100, 200)

        textAlign(CENTER, CENTER)
        textSize(48)
        colorMode(HSB)
        for(let y=0; y<this.boardSize; y++) {
            for (let x=0; x<this.boardSize; x++) {
                let [py, px] = [y*this.cellSize, x*this.cellSize]
                fill(...this.getCellColor(this.board[y][x]))
                square(px, py, this.cellSize, 10)
                fill(0, 0, 0)
                text(this.board[y][x], px, py)
            }
        }
    }

    getCellColor(value) {
        let saturation = 0
        if (value !== EMPTY_CELL) {
            saturation = Math.log2(value) * 5
        }
        return [50, saturation, 100]
    }

    initializeState() {
        for (let i=0; i<2; i++) {
            this.generateNewCell()
        }
    }

    generateNewCell() {
        let emptyCells = []
        for(let y=0; y<this.boardSize; y++) {
            for (let x=0; x<this.boardSize; x++) {
                if (this.board[y][x] === EMPTY_CELL) {
                    emptyCells.push([y, x])
                }
            }
        }
        if (emptyCells.length === 0) {
            return false
        }
        let [y, x] = emptyCells[floor(random(emptyCells.length))]
        this.board[y][x] = this.chooseRandomCellValue()
        return true
    }

    isGameOver() {
        for (let y=0; y<this.boardSize; y++) {
            for (let x=0; x<this.boardSize; x++) {
                if (this.board[y][x] === EMPTY_CELL || 
                    (x < this.boardSize-1 && this.board[y][x] == this.board[y][x+1]) ||
                    (y < this.boardSize-1 && this.board[y][x] == this.board[y+1][x])) {
                    return false
                }
            }
        }
        return true
    }

    chooseRandomCellValue() {
        return floor(random(10)) < 9 ? 2 : 4
    }

    reset() {
        for (let y=0; y<this.boardSize; y++) {
            for (let x=0; x<this.boardSize; x++) {
                this.board[y][x] = EMPTY_CELL
            }
        }
    }

    executeCommand(keyCode) {
        switch(keyCode) {
            case SPACE_KEY_CODE:
                let flag = this.state.transition(DEFAULT_ACTION)
                if (flag) {
                    switch(this.state.get()) {
                        case NOT_STARTED:
                            this.reset()
                            break
                        case PLAYING:
                            this.initializeState()
                            break
                    }
                }
                break
            case LEFT_ARROW:
            case UP_ARROW:
            case RIGHT_ARROW:
            case DOWN_ARROW:
                if (this.state.get() === PLAYING) {
                    let cmd = this.arrowCommand.get(keyCode)
                    if (cmd()) {
                        if (!this.generateNewCell() || this.isGameOver()) {
                            this.state.transition(DEFAULT_ACTION)
                        }
                    }
                }
                break
        }
    }

    moveLeft = () => {
        let swap = false
        for (let y=0; y<this.boardSize; y++) {
            let arr = [...this.board[y]].reverse()
            let compacted = this.compact(arr)
            let diff = this.boardSize - compacted.length
            if (diff > 0) {
                swap = true
                for (let x=0; x<this.boardSize; x++) {
                    if (x >= compacted.length) {
                        this.board[y][x] = EMPTY_CELL
                    } else {
                        this.board[y][x] = compacted[compacted.length-1-x]
                    }
                }
            }
        }
        return swap
    }

    moveUp = () =>  {
        let swap = false
        for (let x=0; x<this.boardSize; x++) {
            let arr = this.board.map(row => row[x]).reverse()
            let compacted = this.compact(arr)
            let diff = this.boardSize - compacted.length
            if (diff > 0) {
                swap = true
                for (let y=0; y<this.boardSize; y++) {
                    if (y >= compacted.length) {
                        this.board[y][x] = EMPTY_CELL
                    } else {
                        this.board[y][x] = compacted[compacted.length-1-y]
                    }
                }
            }
        }
        return swap
    }

    moveRight = () => {
        let swap = false
        for (let y=0; y<this.boardSize; y++) {
            let arr = this.board[y]
            let compacted = this.compact(arr)
            let diff = this.boardSize - compacted.length
            if (diff > 0) {
                swap = true
                for (let x=0; x<this.boardSize; x++) {
                    if (x < diff) {
                        this.board[y][x] = EMPTY_CELL
                    } else {
                        this.board[y][x] = compacted[x-diff]
                    }
                }
            }
        }
        return swap
    }

    moveDown = () => {
        let swap = false
        for (let x=0; x<this.boardSize; x++) {
            let arr = this.board.map(row => row[x])
            let compacted = this.compact(arr)
            let diff = this.boardSize - compacted.length
            if (diff > 0) {
                swap = true
                for (let y=0; y<this.boardSize; y++) {
                    if (y < diff) {
                        this.board[y][x] = EMPTY_CELL
                    } else {
                        this.board[y][x] = compacted[y-diff]
                    }
                }
            }
        }
        return swap
    }

    /*
    edge cases:
    [2, 2, 2, 2]    => [4, 4]
    [2, 2, 2, 4]    => [4, 2, 4]
    [2, '', '', 2]  => [4]
    [2, '', 2, '']  => [4]
    [2, 2, '', 4]   => [4, 4]
    ['', 2, 2, 2]   => ['', 4, 2]
    ['', 2, 2, 4]   => ['', 4, 4]
    */
    compact(arr) {
        let compactArr = []
        let i = 0
        let ci = -1
        while (i < arr.length && arr[i] === EMPTY_CELL) {
            compactArr.push(arr[i])
            i++
            ci++
        }
        let canMerge = true
        for(; i<arr.length; i++) {
            if (arr[i] === EMPTY_CELL) {
                continue
            }
            if (ci < 0 || compactArr[ci] !== arr[i] || !canMerge) {
                compactArr.push(arr[i])
                canMerge = true
                ci++
            } else {
                compactArr[ci] = 2*arr[i]
                canMerge = false
            }
        }
        return compactArr
    }
}

class StateMachine {
    constructor(state, transitions) {
        this.state = state
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
