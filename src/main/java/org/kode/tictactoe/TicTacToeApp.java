package org.kode.tictactoe;

import java.io.*;
import java.util.*;
import java.util.function.*;
import java.util.regex.*;
import java.util.stream.*;

public class TicTacToeApp {
    public static void main(String[] args) throws IOException {
        Game game = new ConsoleGame();
        var reader = new BufferedReader(new InputStreamReader(System.in));
        var pattern = Pattern.compile("\\s+");
        var shouldContinue = true;
        while (shouldContinue) {
            System.out.print("\033\143"); // clear screen on every render
            game.show();
            System.out.println("R: for resetting game");
            System.out.println("E: for exit");
            var input = reader.readLine();
            if ("R".equalsIgnoreCase(input)) {
                game.reset();
            } else if ("E".equalsIgnoreCase(input)) {
                shouldContinue = false;
            } else {
                try {
                    String[] parts = pattern.split(input, 2);
                    int row = Integer.parseInt(parts[0]);
                    int col = Integer.parseInt(parts[1]);
                    game.move(row, col);
                } catch (Exception ignored) {}
            }
        }
    }
}

interface Game {
    void move(int row, int col);
    void reset();
    void show();
}

class ConsoleGame extends AbstractGame {
    ConsoleGame() {
        super(new GameState(), new PlayerState(), new ConsoleBoard(3));
    }

    @Override
    public void show() {
        System.out.println("######## Tic-Tac-Toe ########");
        System.out.println("Current Player: " + playerState.get());
        System.out.println("Status: " + gameState.get());
        board.show();
    }
}

abstract class AbstractGame implements Game {
    final StateMachine gameState;
    final StateMachine playerState;
    final Board board;

    AbstractGame(StateMachine gameState, StateMachine playerState, Board board) {
        this.gameState = gameState;
        this.playerState = playerState;
        this.board = board;
    }

    @Override
    public void reset() {
        gameState.reset();
        playerState.reset();
        board.reset();
    }

    @Override
    public void move(int row, int col) {
        if (!Board.BLANK_CELL.equals(board.valueAt(row, col)) || !gameState.transition(GameAction.MOVE)) {
            return;
        }

        board.assign(row, col, playerState.get());
        playerState.transition(PlayerAction.MOVE);

        updateGameState();
    }

    protected void updateGameState() {
        // check if anybody won horizontally
        if (IntStream.range(0, board.size()).anyMatch(i -> {
            var value = board.valueAt(i, 0);
            if (!Board.BLANK_CELL.equals(value) &&
                    IntStream.range(1, board.size()).mapToObj(c -> board.valueAt(i, c)).allMatch(value::equals)) {
                gameState.transition("X".equals(value) ? GameAction.X_WON : GameAction.O_WON);
                return true;
            }
            return false;
        })) {
            return;
        }

        // check if anybody won vertically
        if (IntStream.range(0, board.size()).anyMatch(i -> {
            var value = board.valueAt(0, i);
            if (!Board.BLANK_CELL.equals(value) &&
                    IntStream.range(1, board.size()).mapToObj(r -> board.valueAt(r, i)).allMatch(value::equals)) {
                gameState.transition("X".equals(value) ? GameAction.X_WON : GameAction.O_WON);
                return true;
            }
            return false;
        })) {
            return;
        }

        // check if anybody won diagonally
        var topLeftValue = board.valueAt(0, 0);
        if (!Board.BLANK_CELL.equals(topLeftValue) &&
                IntStream.range(1, board.size()).mapToObj(i -> board.valueAt(i, i)).allMatch(topLeftValue::equals)) {
            gameState.transition("X".equals(topLeftValue) ? GameAction.X_WON : GameAction.O_WON);
            return;
        }
        var topRightValue = board.valueAt(0, board.size()-1);
        if (!Board.BLANK_CELL.equals(topRightValue) &&
                IntStream.range(1, board.size()).mapToObj(i -> board.valueAt(i, board.size()-1-i)).allMatch(topRightValue::equals)) {
            gameState.transition("X".equals(topRightValue) ? GameAction.X_WON : GameAction.O_WON);
            return;
        }

        // check if draw
        for (String value : board) {
            if (Board.BLANK_CELL.equals(value)) {
                return;
            }
        }
        gameState.transition(GameAction.DRAW);
    }
}

interface Board extends Iterable<String> {
    String BLANK_CELL = " ";
    int size();
    void reset();
    void show();
    void assign(int row, int col, String value);
    String valueAt(int row, int col);
}

class ConsoleBoard implements Board {
    protected final int size;
    protected final int numCells;
    protected final String[] state;

    ConsoleBoard(int size) {
        this.size = size;
        numCells = size*size;
        state = new String[numCells];
        this.reset();
    }

    protected int getIndex(int row, int col) {
        return row*size + col;
    }

    @Override
    public int size() {
        return size;
    }

    @Override
    public void reset() {
        for(int i=0; i<numCells; i++) {
            state[i] = BLANK_CELL;
        }
    }

    @Override
    public void show() {
        IntStream.range(0, size).forEach(row -> {
            var line = IntStream.range(0, size)
                    .mapToObj(col -> state[getIndex(row, col)])
                    .collect(Collectors.joining(" : "));
            System.out.println(line);
        });
    }

    @Override
    public void assign(int row, int col, String value) {
        if (row < 0 || row >= size) throw new IllegalArgumentException("row must be within size");
        if (col < 0 || col >= size) throw new IllegalArgumentException("col must be within size");
        state[getIndex(row, col)] = value;
    }

    @Override
    public String valueAt(int row, int col) {
        return state[getIndex(row, col)];
    }

    @Override
    public Iterator<String> iterator() {
        return Arrays.stream(state, 0, numCells).iterator();
    }
}

interface StateMachine extends Supplier<String> {
    void reset();
    boolean transition(String action);
}

class PlayerAction {
    static final String MOVE = "move";
}

class PlayerState implements StateMachine {
    String state;
    final Map<String, Map<String, String>> transitions;
    static final String O = "O";
    static final String X = "X";

    PlayerState() {
        reset();
        transitions = Map.of(
                O, Map.of(PlayerAction.MOVE, X),
                X, Map.of(PlayerAction.MOVE, O)
        );
    }

    @Override
    public void reset() {
        state = X;
    }

    @Override
    public boolean transition(String action) {
        var nextState = transitions.get(state).get(action);
        if (nextState == null) {
            return false;
        }
        state = nextState;
        return true;
    }

    @Override
    public String get() {
        return state;
    }
}

class GameAction {
    static final String DRAW = "draw";
    static final String MOVE = "move";
    static final String O_WON = "o-won";
    static final String X_WON = "x-won";
}

class GameState implements StateMachine {
    String state;
    final Map<String, Map<String, String>> transitions;
    static final String NOT_STARTED = "Not Started";
    static final String PLAYING = "Playing";
    static final String DRAW = "Draw";
    static final String O_WON = "O Won";
    static final String X_WON = "X Won";

    GameState() {
        reset();
        transitions = Map.of(
                NOT_STARTED,
                Map.of(
                        GameAction.MOVE,
                        PLAYING
                ),
                PLAYING,
                Map.of(
                        GameAction.MOVE,
                        PLAYING,
                        GameAction.DRAW,
                        DRAW,
                        GameAction.O_WON,
                        O_WON,
                        GameAction.X_WON,
                        X_WON
                ),
                DRAW, Map.of(),
                O_WON, Map.of(),
                X_WON, Map.of()
        );
    }

    @Override
    public void reset() {
        state = NOT_STARTED;
    }

    @Override
    public boolean transition(String action) {
        var nextState = transitions.get(state).get(action);
        if (nextState == null) {
            return false;
        }
        state = nextState;
        return true;
    }

    @Override
    public String get() {
        return state;
    }
}
