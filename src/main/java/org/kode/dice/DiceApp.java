package org.kode.dice;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

public class DiceApp {
    public static void main(String[] args) {
        DiceWithHistory dice = new DigitalDice(6, 4);
        for(int i=0; i<5; i++) {
            System.out.println("[" + i + "] :: " + dice.roll());
        }
        System.out.println(StreamSupport.stream(dice.spliterator(), false)
                .map(Object::toString)
                .collect(Collectors.joining(", ")));
    }
}

interface Dice {
    int value();
    int roll();
}

interface DiceWithHistory extends Dice, Iterable<Integer> {}

interface RollStrategy {
    int roll();
}

interface ConfigurableDice {
    void setRollStrategy(RollStrategy rollStrategy);
}

interface Buffer<E> extends Iterable<E> {
    void add(E e);
    int size();
}

class CircularList<E> implements Buffer<E> {
    private final int capacity;
    private final E[] buffer;
    private int insertAt;
    private boolean overflow;

    @SuppressWarnings("unchecked")
    CircularList(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be > 0");
        this.capacity = capacity;
        buffer = (E[]) new Object[capacity];
        insertAt = 0;
        overflow = false;
    }

    @Override
    public void add(E e) {
        buffer[insertAt++] = e;
        if (insertAt == capacity) {
            insertAt = 0;
            overflow = true;
        }
    }

    @Override
    public int size() {
        return overflow ? capacity : insertAt;
    }

    @Override
    public Iterator<E> iterator() {
        return new Iterator<>() {
            private int idx = insertAt;
            private boolean started = false;

            @Override
            public boolean hasNext() {
                if (!overflow) {
                    return idx > 0;
                }
                return !(started && idx == insertAt);
            }

            @Override
            public E next() {
                started = true;
                idx--;
                if (overflow && idx < 0) {
                    idx = capacity-1;
                }
                return buffer[idx];
            }
        };
    }
}

class DigitalDice implements DiceWithHistory, ConfigurableDice {
    private RollStrategy rollStrategy;

    private int currValue;
    private Buffer<Integer> history;

    DigitalDice(int faces, int maxHistory) {
        history = new CircularList<>(maxHistory);
        rollStrategy = new FairRollStrategy(faces);
        currValue = 1;
    }

    @Override
    public int value() {
        return currValue;
    }

    @Override
    public int roll() {
        currValue = rollStrategy.roll();
        history.add(currValue);
        return currValue;
    }

    @Override
    public Iterator<Integer> iterator() {
        return history.iterator();
    }

    @Override
    public void setRollStrategy(RollStrategy rollStrategy) {
        this.rollStrategy = rollStrategy;
    }
}

class FairRollStrategy implements RollStrategy {
    private final int faces;
    private final Random random;

    FairRollStrategy(int faces) {
        this.faces = faces;
        random = new Random();
    }

    @Override
    public int roll() {
        return random.nextInt(faces) + 1;
    }
}
