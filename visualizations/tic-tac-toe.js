class GameState {
    constructor() {
        this.state = 'Not Started'
        this.transitions = {
            'Not Started': {
                'move': 'Playing'
            },
            'Playing': {
                'move': 'Playing',
                'draw': 'Draw',
                'O Won': 'O Won',
                'X Won': 'X Won'
            },
            'O Won': {},
            'X Won': {},
            'Draw': {}
        }
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

class PlayerState {
    constructor() {
        this.state = 'X'
        this.transitions = {
            'X': {
                'move': 'O'
            },
            'O': {
                'move': 'X'
            }
        }
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

class Board {
    constructor(offset, cellSize, handleClick) {
        this.offset = offset
        this.cellSize = cellSize
        this.state = Array(9).fill('')
        this.buttons = this.createButtons()
        this.handleClick = handleClick
    }

    createButtons() {
        let buttons = []
        for (let i = 0; i < 9; i++) {
            let x = this.offset + ((i%3)*this.cellSize)
            let y = this.offset + (Math.floor(i/3)*this.cellSize)
            let btn = createButton(this.state[i])
            btn.position(x, y)
            btn.size(this.cellSize, this.cellSize)
            btn.style('fontSize', '40px')
            btn.mousePressed(() => this.handleClick(this.state[i], this.toggleButton.bind(this, i)))
            buttons.push(btn)
        }
        return buttons
    }

    toggleButton(index, value) {
        this.state[index] = value
        this.buttons[index].html(value)
    }

    reset() {
        let value = ''
        for (let i=0; i<9; i++) {
            this.state[i] = value
            this.buttons[i].html(value)
        }
    }
}

class Game {
    constructor(offset, cellSize) {
        this.playerState = new PlayerState()
        this.gameState = new GameState()
        this.board = new Board(offset, cellSize, this.handleClick.bind(this))
        this.resetButton = this.createResetButton(cellSize)
        this.combinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],    // row-wise
            [0, 3, 6], [1, 4, 7], [2, 5, 8],    // col-wise
            [0, 4, 8], [2, 4, 6]                // dia-wise
        ]
    }

    createResetButton(cellSize) {
        let resetButton = createButton('Reset')
        resetButton.position(150, 450)
        resetButton.size(cellSize, 30)
        resetButton.style('fontSize', '20px')
        resetButton.mousePressed(() => this.reset())
        return resetButton
    }

    handleClick(buttonState, onMove) {
        if (buttonState !== "" || !this.gameState.transition('move')) {
            return
        }
        onMove(this.playerState.get())
        this.playerState.transition('move')

        let boardState = this.board.state
        for (let i=0; i<this.combinations.length; i++) {
            let [c0, c1, c2] = this.combinations[i]
            if (boardState[c0] !== '' && boardState[c0] === boardState[c1] && boardState[c1] === boardState[c2]) {
                this.gameState.transition(boardState[c0] + ' Won')
                return
            }
        }

        for (let i=0; i<boardState.length; i++) {
            if (boardState[i] === '') {
                return
            }
        }
        this.gameState.transition('draw')
    }

    show() {
        textAlign(CENTER)
        textSize(30)
        text("Tic-Tac-Toe", width/2, 35)
        textSize(20)
        text("Current Player: " + this.playerState.get(), width/2, 400)
        text("Status: " + this.gameState.get(), width/2, 425)
    }

    reset() {
        this.playerState = new PlayerState()
        this.gameState = new GameState()
        this.board.reset()
    }

}

let game

function setup() {
    createCanvas(400, 500)
    let offset = 50, cellSize = 100
    game = new Game(offset, cellSize)
}

function draw() {
    background('grey')
    game.show()
}
