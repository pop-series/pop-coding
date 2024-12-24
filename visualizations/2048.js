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
    
    // background(220);
    // textAlign(CENTER, CENTER);
    // textSize(30); // Increased text size
    
    // let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    // let boxSize = 50;
    
    // for(let i = 0; i < 10; i++) {
    //   let x = 50 + i*60;
    //   let y = 50;
      
    //   // Draw box
    //   fill(255);  // White background
    //   rect(x, y, boxSize, boxSize);
      
    //   // Draw text
    //   fill(0);    // Black text
    //   noStroke();
    //   text(letters[i], x, y);
    // }
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
        // this.initializeState()
    }

    show() {
        textSize(72)
        text("2048", 175, 75)
        textSize(24)
        text("Status: " + this.state.get(), 150, 125)
        translate(100, 200)

        textAlign(CENTER, CENTER)
        textSize(48)
        for(let y=0; y<this.boardSize; y++) {
            for (let x=0; x<this.boardSize; x++) {
                let [py, px] = [y*this.cellSize, x*this.cellSize]
                square(px, py, this.cellSize, 10)
                text(this.board[y][x], px, py)
            }
        }
    }

    initializeState() {
        for (let i=0; i<2; i++) {
            this.generateNewCell()
        }
    }

    generateNewCell() {
        let [y, x] = this.chooseRandomNonEmptyCell()
        this.board[y][x] = this.chooseRandomCellValue()
    }

    chooseRandomNonEmptyCell() {
        return [floor(random(this.boardSize)), floor(random(this.boardSize))]
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
                        this.generateNewCell()
                    }
                }
                break
        }
    }

    moveLeft = () => {
        console.log('cmd left')
        return false
    }

    moveUp = () =>  {
        console.log('cmd up')
        return false
    }

    moveRight = () => {
        console.log('cmd right')
        return false
    }

    moveDown = () => {
        let swap = false
        for(let y=0; y<this.boardSize-1; y++) {
            for (let x=0; x<this.boardSize; x++) {
                swap = this.tryUpdateCells(y+1, x, y, x) || swap
            }
        }
        return swap
    }

    tryUpdateCells(y1, x1, y2, x2) {
        if (this.board[y1][x1] === EMPTY_CELL) {
            if (this.board[y2][x2] !== EMPTY_CELL) {
                [this.board[y1][x1], this.board[y2][x2]] = [this.board[y2][x2], this.board[y1][x1]]
                return true
            }
        } else if (this.board[y1][x1] === this.board[y2][x2]) {
            [this.board[y1][x1], this.board[y2][x2]] = [2*this.board[y1][x1], EMPTY_CELL]
            return true
        }
        return false
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
